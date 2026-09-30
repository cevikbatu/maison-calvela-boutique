-- DRAFT: requires explicit approval before live application.
-- No historical delivery dates are inferred or backfilled.
ALTER TABLE public.orders ADD COLUMN delivered_at timestamptz;
CREATE TABLE public.service_requests (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 order_id uuid NOT NULL REFERENCES public.orders(id),
 order_item_id uuid NOT NULL REFERENCES public.order_items(id),
 kind text NOT NULL CHECK(kind IN('return','exchange','defect')),
 email text NOT NULL,
 reason text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','reviewing','approved','rejected','processing','completed')),
 decision_reason text NOT NULL DEFAULT '',
 decided_by uuid REFERENCES auth.users(id),
 decided_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_requests_owner_created ON public.service_requests(user_id,created_at DESC);
CREATE INDEX service_requests_status_created ON public.service_requests(status,created_at DESC);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_requests FROM anon,authenticated;
GRANT SELECT ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
CREATE POLICY requests_read ON public.service_requests FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) OR app_private.has_role((SELECT auth.uid()),'admin'));

CREATE TABLE public.service_request_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid NOT NULL REFERENCES public.service_requests(id),
 status text NOT NULL,description text NOT NULL DEFAULT '',actor_id uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_request_history_request ON public.service_request_history(request_id,created_at);
ALTER TABLE public.service_request_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_request_history FROM anon,authenticated;
GRANT SELECT ON public.service_request_history TO authenticated;
GRANT ALL ON public.service_request_history TO service_role;
CREATE POLICY request_history_read ON public.service_request_history FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.service_requests r WHERE r.id=request_id));

CREATE TABLE app_private.service_email_queue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid NOT NULL REFERENCES public.service_requests(id),
 recipient text NOT NULL,event text NOT NULL,decision_reason text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),delivery_enabled boolean NOT NULL DEFAULT false CHECK(NOT delivery_enabled)
);
ALTER TABLE app_private.service_email_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.service_email_queue FROM PUBLIC,anon,authenticated;
GRANT SELECT ON app_private.service_email_queue TO service_role;

CREATE FUNCTION app_private.create_service_request(p_id uuid,p_order_item_id uuid,p_kind text,p_email text,p_reason text,p_description text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); item public.order_items; purchase public.orders; previous public.service_requests; initial text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required';END IF;
 IF p_id IS NULL OR p_kind IS NULL OR p_kind NOT IN('return','exchange','defect')
 OR p_email IS NULL OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(p_email)>254
 OR p_reason IS NULL OR p_description IS NULL OR length(p_reason)>1000 OR length(p_description)>5000
 OR (p_kind='exchange' AND length(btrim(p_reason))=0) THEN RAISE EXCEPTION 'invalid request';END IF;
 -- Lock the order for consistent ownership/delivery checks and serialize repeat submissions.
 SELECT * INTO item FROM public.order_items WHERE id=p_order_item_id;
 SELECT * INTO purchase FROM public.orders WHERE id=item.order_id AND user_id=actor FOR SHARE;
 IF purchase.id IS NULL THEN RAISE EXCEPTION 'order not accessible';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,7650));
 SELECT * INTO previous FROM public.service_requests WHERE id=p_id;
 IF FOUND THEN
  IF previous.user_id=actor AND previous.order_item_id=p_order_item_id AND previous.kind=p_kind
   AND previous.email=btrim(p_email) AND previous.reason=btrim(p_reason) AND previous.description=btrim(p_description) THEN RETURN previous.id;END IF;
  RAISE EXCEPTION 'request conflict';
 END IF;
 -- An unknown delivery date never causes automatic rejection. Late exchange requests also go to review.
 initial:=CASE WHEN purchase.delivered_at IS NULL OR (p_kind='exchange' AND purchase.delivered_at<now()-interval '7 days') THEN 'reviewing' ELSE 'pending' END;
 INSERT INTO public.service_requests(id,user_id,order_id,order_item_id,kind,email,reason,description,status)
 VALUES(p_id,actor,purchase.id,item.id,p_kind,btrim(p_email),btrim(p_reason),btrim(p_description),initial);
 INSERT INTO public.service_request_history(request_id,status,actor_id) VALUES(p_id,initial,actor);
 INSERT INTO app_private.service_email_queue(request_id,recipient,event) VALUES(p_id,btrim(p_email),'received');
 RETURN p_id;
END $$;
CREATE FUNCTION public.create_service_request(p_id uuid,p_order_item_id uuid,p_kind text,p_email text,p_reason text,p_description text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT app_private.create_service_request(p_id,p_order_item_id,p_kind,p_email,p_reason,p_description)$$;
REVOKE ALL ON FUNCTION app_private.create_service_request(uuid,uuid,text,text,text,text),public.create_service_request(uuid,uuid,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_private.create_service_request(uuid,uuid,text,text,text,text),public.create_service_request(uuid,uuid,text,text,text,text) TO authenticated;

CREATE FUNCTION app_private.decide_service_request(p_id uuid,p_expected_updated_at timestamptz,p_status text,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); request public.service_requests;
BEGIN
 IF actor IS NULL OR NOT app_private.has_role(actor,'admin') THEN RAISE EXCEPTION 'admin required';END IF;
 SELECT * INTO request FROM public.service_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR request.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'request changed';END IF;
 IF p_status IS NULL OR p_status NOT IN('reviewing','approved','rejected','processing','completed') OR p_reason IS NULL OR length(p_reason)>2000 THEN RAISE EXCEPTION 'invalid decision';END IF;
 IF request.status IN('completed','rejected') THEN RAISE EXCEPTION 'request closed';END IF;
 IF p_status='rejected' AND (request.kind<>'exchange' OR length(btrim(p_reason))=0) THEN RAISE EXCEPTION 'statutory rights cannot be rejected through this workflow';END IF;
 IF p_status='rejected' AND request.kind='exchange' AND request.status NOT IN('pending','reviewing') THEN RAISE EXCEPTION 'invalid transition';END IF;
 IF NOT ((request.status IN('pending','reviewing') AND p_status IN('reviewing','approved','rejected','processing'))
 OR (request.status='approved' AND p_status='processing') OR (request.status='processing' AND p_status='completed')) THEN RAISE EXCEPTION 'invalid transition';END IF;
 UPDATE public.service_requests SET status=p_status,decision_reason=btrim(p_reason),decided_by=actor,decided_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=p_id;
 INSERT INTO public.service_request_history(request_id,status,description,actor_id) VALUES(p_id,p_status,btrim(p_reason),actor);
 INSERT INTO app_private.service_email_queue(request_id,recipient,event,decision_reason) VALUES(p_id,request.email,p_status,btrim(p_reason));
 RETURN true;
END $$;
CREATE FUNCTION public.decide_service_request(p_id uuid,p_expected_updated_at timestamptz,p_status text,p_reason text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT app_private.decide_service_request(p_id,p_expected_updated_at,p_status,p_reason)$$;
REVOKE ALL ON FUNCTION app_private.decide_service_request(uuid,timestamptz,text,text),public.decide_service_request(uuid,timestamptz,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_private.decide_service_request(uuid,timestamptz,text,text),public.decide_service_request(uuid,timestamptz,text,text) TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('service-request-photos','service-request-photos',false,5242880,ARRAY['image/jpeg','image/png','image/webp']);
CREATE POLICY request_photos_read ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='service-request-photos' AND EXISTS(SELECT 1 FROM public.service_requests r WHERE r.id::text=split_part(name,'/',1)));
CREATE POLICY request_photos_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 bucket_id='service-request-photos' AND EXISTS(SELECT 1 FROM public.service_requests r WHERE r.id::text=split_part(name,'/',1) AND r.user_id=(SELECT auth.uid()) AND r.status IN('pending','reviewing')));
