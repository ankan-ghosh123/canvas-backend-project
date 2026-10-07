--
-- PostgreSQL database dump
--

\restrict Nh25Nl6EptpSGSRZS8DQlamF2jzLWlzBSRaffx6lXud00gYv7AsudScUnspsaKx

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-10-07 18:57:57

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 876 (class 1247 OID 16875)
-- Name: post_sts_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.post_sts_enum AS ENUM (
    'MARKED',
    'CANDIDATE',
    'POEM_OF_WEEK'
);


ALTER TYPE public.post_sts_enum OWNER TO postgres;

--
-- TOC entry 861 (class 1247 OID 16754)
-- Name: post_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.post_type_enum AS ENUM (
    'TYPED',
    'IMAGE_UPLOAD'
);


ALTER TYPE public.post_type_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 16802)
-- Name: backgrounds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backgrounds (
    background_id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_url character varying(2048) NOT NULL,
    category character varying(50) DEFAULT 'nature'::character varying,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.backgrounds OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16903)
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    comment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    comment text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_comment_length CHECK ((char_length(comment) <= 1000))
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16881)
-- Name: post_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    status public.post_sts_enum DEFAULT 'MARKED'::public.post_sts_enum NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.post_tracking OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16777)
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    post_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid CONSTRAINT posts_id_not_null NOT NULL,
    caption text,
    post_type public.post_type_enum NOT NULL,
    poem_text text,
    media_url character varying(2048) NOT NULL,
    text_style_config jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    poem_name character varying(255) DEFAULT 'Untitled'::character varying NOT NULL,
    CONSTRAINT check_caption_length CHECK ((char_length(caption) <= 500)),
    CONSTRAINT check_typed_post_requirements CHECK ((((post_type = 'TYPED'::public.post_type_enum) AND (poem_text IS NOT NULL) AND (text_style_config IS NOT NULL)) OR (post_type = 'IMAGE_UPLOAD'::public.post_type_enum)))
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16733)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fullname character varying(100) NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(400) NOT NULL,
    password text NOT NULL,
    role character varying(100) DEFAULT 'user'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    refresh_token text,
    avatar_url character varying(2048) DEFAULT NULL::character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16847)
-- Name: yt_vid; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.yt_vid (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vid_id character varying(15) NOT NULL,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.yt_vid OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16862)
-- Name: ytposters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ytposters (
    poster_id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_url character varying(2048) NOT NULL,
    caption text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ytposters OWNER TO postgres;

--
-- TOC entry 4921 (class 2606 OID 16813)
-- Name: backgrounds backgrounds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backgrounds
    ADD CONSTRAINT backgrounds_pkey PRIMARY KEY (background_id);


--
-- TOC entry 4935 (class 2606 OID 16917)
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (comment_id);


--
-- TOC entry 4931 (class 2606 OID 16892)
-- Name: post_tracking post_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tracking
    ADD CONSTRAINT post_tracking_pkey PRIMARY KEY (id);


--
-- TOC entry 4933 (class 2606 OID 16894)
-- Name: post_tracking post_tracking_post_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tracking
    ADD CONSTRAINT post_tracking_post_id_key UNIQUE (post_id);


--
-- TOC entry 4919 (class 2606 OID 16794)
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (post_id);


--
-- TOC entry 4909 (class 2606 OID 16752)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4911 (class 2606 OID 16748)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4913 (class 2606 OID 16816)
-- Name: users users_refresh_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_refresh_token_key UNIQUE (refresh_token);


--
-- TOC entry 4915 (class 2606 OID 16750)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4924 (class 2606 OID 16856)
-- Name: yt_vid yt_vid_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.yt_vid
    ADD CONSTRAINT yt_vid_pkey PRIMARY KEY (id);


--
-- TOC entry 4926 (class 2606 OID 16873)
-- Name: ytposters ytposters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ytposters
    ADD CONSTRAINT ytposters_pkey PRIMARY KEY (poster_id);


--
-- TOC entry 4936 (class 1259 OID 16928)
-- Name: idx_comments_post_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_post_id_created_at ON public.comments USING btree (post_id, created_at DESC, comment_id DESC);


--
-- TOC entry 4927 (class 1259 OID 16902)
-- Name: idx_post_tracking_status_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_tracking_status_created_at ON public.post_tracking USING btree (status, created_at DESC);


--
-- TOC entry 4916 (class 1259 OID 16801)
-- Name: idx_posts_feed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_feed ON public.posts USING btree (created_at DESC, post_id DESC);


--
-- TOC entry 4917 (class 1259 OID 16844)
-- Name: idx_posts_user_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_user_id_created_at ON public.posts USING btree (user_id, created_at DESC, post_id DESC);


--
-- TOC entry 4928 (class 1259 OID 16900)
-- Name: indx_one_candidate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX indx_one_candidate ON public.post_tracking USING btree (status) WHERE (status = 'CANDIDATE'::public.post_sts_enum);


--
-- TOC entry 4929 (class 1259 OID 16901)
-- Name: indx_one_poem_of_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX indx_one_poem_of_week ON public.post_tracking USING btree (status) WHERE (status = 'POEM_OF_WEEK'::public.post_sts_enum);


--
-- TOC entry 4922 (class 1259 OID 16861)
-- Name: vid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX vid_index ON public.yt_vid USING btree (added_at DESC);


--
-- TOC entry 4939 (class 2606 OID 16923)
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id) ON DELETE CASCADE;


--
-- TOC entry 4940 (class 2606 OID 16918)
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4937 (class 2606 OID 16795)
-- Name: posts fk_posts_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4938 (class 2606 OID 16895)
-- Name: post_tracking post_tracking_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tracking
    ADD CONSTRAINT post_tracking_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id) ON DELETE CASCADE;


-- Completed on 2026-10-07 18:57:57

--
-- PostgreSQL database dump complete
--

\unrestrict Nh25Nl6EptpSGSRZS8DQlamF2jzLWlzBSRaffx6lXud00gYv7AsudScUnspsaKx

