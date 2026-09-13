--
-- PostgreSQL database dump
--

\restrict Z0Gk7AiErIvg4HSBCSAyAOPoWy4LmB99LyS2BtvUnvT9fXSI1XsyYgCLJFzIw4e

-- Dumped from database version 15.19 (Debian 15.19-1.pgdg13+2)
-- Dumped by pg_dump version 15.19 (Debian 15.19-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.weightage_rules DROP CONSTRAINT IF EXISTS weightage_rules_topic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.weightage_rules DROP CONSTRAINT IF EXISTS weightage_rules_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.topics DROP CONSTRAINT IF EXISTS topics_subject_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shifts DROP CONSTRAINT IF EXISTS shifts_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shift_questions DROP CONSTRAINT IF EXISTS shift_questions_shift_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shift_questions DROP CONSTRAINT IF EXISTS shift_questions_question_id_fkey;
ALTER TABLE IF EXISTS ONLY public.results DROP CONSTRAINT IF EXISTS results_shift_id_fkey;
ALTER TABLE IF EXISTS ONLY public.results DROP CONSTRAINT IF EXISTS results_candidate_id_fkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_topic_id_fkey;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.disqualification_log DROP CONSTRAINT IF EXISTS disqualification_log_candidate_id_fkey;
ALTER TABLE IF EXISTS ONLY public.candidates DROP CONSTRAINT IF EXISTS candidates_used_in_shift_id_fkey;
ALTER TABLE IF EXISTS ONLY public.candidates DROP CONSTRAINT IF EXISTS candidates_shift_id_fkey;
ALTER TABLE IF EXISTS ONLY public.candidate_sessions DROP CONSTRAINT IF EXISTS candidate_sessions_shift_id_fkey;
ALTER TABLE IF EXISTS ONLY public.candidate_sessions DROP CONSTRAINT IF EXISTS candidate_sessions_candidate_id_fkey;
ALTER TABLE IF EXISTS ONLY public.candidate_questions DROP CONSTRAINT IF EXISTS candidate_questions_question_id_fkey;
ALTER TABLE IF EXISTS ONLY public.candidate_questions DROP CONSTRAINT IF EXISTS candidate_questions_candidate_id_fkey;
DROP INDEX IF EXISTS public.idx_disq_log_reported;
ALTER TABLE IF EXISTS ONLY public.weightage_rules DROP CONSTRAINT IF EXISTS weightage_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.weightage_rules DROP CONSTRAINT IF EXISTS weightage_rules_exam_id_topic_id_key;
ALTER TABLE IF EXISTS ONLY public.topics DROP CONSTRAINT IF EXISTS topics_pkey;
ALTER TABLE IF EXISTS ONLY public.subjects DROP CONSTRAINT IF EXISTS subjects_pkey;
ALTER TABLE IF EXISTS ONLY public.shifts DROP CONSTRAINT IF EXISTS shifts_pkey;
ALTER TABLE IF EXISTS ONLY public.shift_questions DROP CONSTRAINT IF EXISTS shift_questions_shift_id_question_id_key;
ALTER TABLE IF EXISTS ONLY public.shift_questions DROP CONSTRAINT IF EXISTS shift_questions_pkey;
ALTER TABLE IF EXISTS ONLY public.results DROP CONSTRAINT IF EXISTS results_pkey;
ALTER TABLE IF EXISTS ONLY public.results DROP CONSTRAINT IF EXISTS results_candidate_shift_unique;
ALTER TABLE IF EXISTS ONLY public.results DROP CONSTRAINT IF EXISTS results_candidate_id_shift_id_key;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_config DROP CONSTRAINT IF EXISTS exam_config_pkey;
ALTER TABLE IF EXISTS ONLY public.disqualification_log DROP CONSTRAINT IF EXISTS disqualification_log_pkey;
ALTER TABLE IF EXISTS ONLY public.candidates DROP CONSTRAINT IF EXISTS candidates_token_key;
ALTER TABLE IF EXISTS ONLY public.candidates DROP CONSTRAINT IF EXISTS candidates_roll_no_key;
ALTER TABLE IF EXISTS ONLY public.candidates DROP CONSTRAINT IF EXISTS candidates_pkey;
ALTER TABLE IF EXISTS ONLY public.candidate_sessions DROP CONSTRAINT IF EXISTS candidate_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.candidate_questions DROP CONSTRAINT IF EXISTS candidate_questions_pkey;
ALTER TABLE IF EXISTS ONLY public.candidate_questions DROP CONSTRAINT IF EXISTS candidate_questions_candidate_id_question_id_key;
ALTER TABLE IF EXISTS ONLY public.candidate_questions DROP CONSTRAINT IF EXISTS candidate_questions_candidate_id_position_key;
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS admins_username_key;
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS admins_pkey;
ALTER TABLE IF EXISTS public.weightage_rules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.topics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.shifts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.shift_questions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.results ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.questions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.exam_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.disqualification_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.candidates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.candidate_sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.candidate_questions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admins ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.weightage_rules_id_seq;
DROP TABLE IF EXISTS public.weightage_rules;
DROP SEQUENCE IF EXISTS public.topics_id_seq;
DROP TABLE IF EXISTS public.topics;
DROP SEQUENCE IF EXISTS public.subjects_id_seq;
DROP TABLE IF EXISTS public.subjects;
DROP SEQUENCE IF EXISTS public.shifts_id_seq;
DROP TABLE IF EXISTS public.shifts;
DROP SEQUENCE IF EXISTS public.shift_questions_id_seq;
DROP TABLE IF EXISTS public.shift_questions;
DROP SEQUENCE IF EXISTS public.results_id_seq;
DROP TABLE IF EXISTS public.results;
DROP SEQUENCE IF EXISTS public.questions_id_seq;
DROP TABLE IF EXISTS public.questions;
DROP SEQUENCE IF EXISTS public.exam_config_id_seq;
DROP TABLE IF EXISTS public.exam_config;
DROP SEQUENCE IF EXISTS public.disqualification_log_id_seq;
DROP TABLE IF EXISTS public.disqualification_log;
DROP SEQUENCE IF EXISTS public.candidates_id_seq;
DROP TABLE IF EXISTS public.candidates;
DROP SEQUENCE IF EXISTS public.candidate_sessions_id_seq;
DROP TABLE IF EXISTS public.candidate_sessions;
DROP SEQUENCE IF EXISTS public.candidate_questions_id_seq;
DROP TABLE IF EXISTS public.candidate_questions;
DROP SEQUENCE IF EXISTS public.admins_id_seq;
DROP TABLE IF EXISTS public.admins;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL
);


--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: candidate_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_questions (
    id integer NOT NULL,
    candidate_id integer NOT NULL,
    question_id integer NOT NULL,
    "position" integer NOT NULL,
    selected_opt character(1),
    is_marked boolean DEFAULT false NOT NULL,
    answered_at timestamp with time zone,
    CONSTRAINT candidate_questions_selected_opt_check CHECK ((selected_opt = ANY (ARRAY['a'::bpchar, 'b'::bpchar, 'c'::bpchar, 'd'::bpchar])))
);


--
-- Name: candidate_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidate_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidate_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidate_questions_id_seq OWNED BY public.candidate_questions.id;


--
-- Name: candidate_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_sessions (
    id integer NOT NULL,
    candidate_id integer NOT NULL,
    shift_id integer NOT NULL,
    socket_id text,
    join_time timestamp with time zone DEFAULT now(),
    end_time timestamp with time zone NOT NULL,
    active_seconds integer DEFAULT 0 NOT NULL,
    time_remaining_sec integer,
    last_active_at timestamp with time zone,
    tab_is_active boolean DEFAULT true NOT NULL,
    is_submitted boolean DEFAULT false NOT NULL,
    submitted_at timestamp with time zone,
    admin_reopened boolean DEFAULT false NOT NULL,
    admin_reopen_at timestamp with time zone,
    score numeric(10,2),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: candidate_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidate_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidate_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidate_sessions_id_seq OWNED BY public.candidate_sessions.id;


--
-- Name: candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidates (
    id integer NOT NULL,
    name text NOT NULL,
    roll_no text NOT NULL,
    branch text NOT NULL,
    section text NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    shift_id integer NOT NULL,
    token_used boolean DEFAULT false NOT NULL,
    used_in_shift_id integer,
    session_version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidates_id_seq OWNED BY public.candidates.id;


--
-- Name: disqualification_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disqualification_log (
    id integer NOT NULL,
    team_name character varying(255),
    round character varying(100),
    violations integer,
    candidate_id integer,
    reported_at timestamp with time zone DEFAULT now()
);


--
-- Name: disqualification_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.disqualification_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: disqualification_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.disqualification_log_id_seq OWNED BY public.disqualification_log.id;


--
-- Name: exam_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_config (
    id integer NOT NULL,
    name text NOT NULL,
    total_duration_min integer DEFAULT 60 NOT NULL,
    grace_join_min integer DEFAULT 15 NOT NULL,
    questions_per_shift integer DEFAULT 75 NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    questions_per_candidate integer DEFAULT 30 NOT NULL,
    pass_mark_pct numeric(5,2) DEFAULT 40 NOT NULL,
    grade_ranges jsonb
);


--
-- Name: exam_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_config_id_seq OWNED BY public.exam_config.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    topic_id integer NOT NULL,
    difficulty text NOT NULL,
    body text NOT NULL,
    option_a text NOT NULL,
    option_b text NOT NULL,
    option_c text NOT NULL,
    option_d text NOT NULL,
    correct_opt character(1) NOT NULL,
    explanation text,
    image_url text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    opt_a_image_url text,
    opt_b_image_url text,
    opt_c_image_url text,
    opt_d_image_url text,
    marks numeric(10,2) DEFAULT 1 NOT NULL,
    negative_marks numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT questions_correct_opt_check CHECK ((correct_opt = ANY (ARRAY['a'::bpchar, 'b'::bpchar, 'c'::bpchar, 'd'::bpchar]))),
    CONSTRAINT questions_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
    CONSTRAINT questions_marks_check CHECK ((marks > (0)::numeric)),
    CONSTRAINT questions_negative_marks_check CHECK ((negative_marks >= (0)::numeric))
);


--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.results (
    id integer NOT NULL,
    candidate_id integer NOT NULL,
    shift_id integer NOT NULL,
    score numeric(10,2) NOT NULL,
    total_questions integer DEFAULT 75 NOT NULL,
    correct_count integer NOT NULL,
    wrong_count integer NOT NULL,
    skipped_count integer NOT NULL,
    time_taken_sec integer NOT NULL,
    submitted_at timestamp with time zone DEFAULT now(),
    synced_to_cloud boolean DEFAULT false NOT NULL,
    percentage numeric(6,3),
    grade text,
    pass_fail text,
    total_marks numeric(10,2),
    CONSTRAINT results_pass_fail_check CHECK ((pass_fail = ANY (ARRAY['pass'::text, 'fail'::text])))
);


--
-- Name: results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.results_id_seq OWNED BY public.results.id;


--
-- Name: shift_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_questions (
    id integer NOT NULL,
    shift_id integer NOT NULL,
    question_id integer NOT NULL
);


--
-- Name: shift_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shift_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shift_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shift_questions_id_seq OWNED BY public.shift_questions.id;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    name text NOT NULL,
    scheduled_start timestamp with time zone,
    is_active boolean DEFAULT false NOT NULL,
    is_paused boolean DEFAULT false NOT NULL,
    paused_at timestamp with time zone,
    extra_time_min integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    paper_generated boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    access_close_at timestamp with time zone,
    duration_override_min integer
);


--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topics (
    id integer NOT NULL,
    subject_id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: topics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.topics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.topics_id_seq OWNED BY public.topics.id;


--
-- Name: weightage_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weightage_rules (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    topic_id integer NOT NULL,
    easy_count integer DEFAULT 0 NOT NULL,
    medium_count integer DEFAULT 0 NOT NULL,
    hard_count integer DEFAULT 0 NOT NULL,
    student_easy_count integer DEFAULT 0 NOT NULL,
    student_medium_count integer DEFAULT 0 NOT NULL,
    student_hard_count integer DEFAULT 0 NOT NULL
);


--
-- Name: weightage_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weightage_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weightage_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weightage_rules_id_seq OWNED BY public.weightage_rules.id;


--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Name: candidate_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_questions ALTER COLUMN id SET DEFAULT nextval('public.candidate_questions_id_seq'::regclass);


--
-- Name: candidate_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_sessions ALTER COLUMN id SET DEFAULT nextval('public.candidate_sessions_id_seq'::regclass);


--
-- Name: candidates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates ALTER COLUMN id SET DEFAULT nextval('public.candidates_id_seq'::regclass);


--
-- Name: disqualification_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disqualification_log ALTER COLUMN id SET DEFAULT nextval('public.disqualification_log_id_seq'::regclass);


--
-- Name: exam_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_config ALTER COLUMN id SET DEFAULT nextval('public.exam_config_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.results ALTER COLUMN id SET DEFAULT nextval('public.results_id_seq'::regclass);


--
-- Name: shift_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_questions ALTER COLUMN id SET DEFAULT nextval('public.shift_questions_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: topics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics ALTER COLUMN id SET DEFAULT nextval('public.topics_id_seq'::regclass);


--
-- Name: weightage_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weightage_rules ALTER COLUMN id SET DEFAULT nextval('public.weightage_rules_id_seq'::regclass);


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admins (id, username, password_hash) FROM stdin;
1	admin	$2b$10$L6WLXfty0ECYV1dI3Yy8WehxZplRcV47u048iAHQuQIIzQBQC2Lgm
\.


--
-- Data for Name: candidate_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidate_questions (id, candidate_id, question_id, "position", selected_opt, is_marked, answered_at) FROM stdin;
37	1	17	2	\N	f	\N
39	1	55	4	\N	f	\N
40	1	267	5	\N	f	\N
42	1	162	7	\N	f	\N
43	1	73	8	\N	f	\N
44	1	271	9	\N	f	\N
45	1	216	10	\N	f	\N
46	1	200	11	\N	f	\N
47	1	147	12	\N	f	\N
49	1	5	14	\N	f	\N
50	1	199	15	\N	f	\N
51	1	56	16	\N	f	\N
52	1	159	17	\N	f	\N
53	1	96	18	\N	f	\N
54	1	266	19	\N	f	\N
55	1	273	20	\N	f	\N
56	1	116	21	\N	f	\N
57	1	101	22	\N	f	\N
58	1	242	23	\N	f	\N
60	1	67	25	\N	f	\N
61	1	43	26	\N	f	\N
62	1	182	27	\N	f	\N
63	1	7	28	\N	f	\N
64	1	192	29	\N	f	\N
65	1	177	30	\N	f	\N
66	1	76	31	\N	f	\N
67	1	110	32	\N	f	\N
68	1	126	33	\N	f	\N
69	1	275	34	\N	f	\N
70	1	186	35	\N	f	\N
36	1	143	1	b	f	2026-09-12 21:26:41.397+00
38	1	129	3	d	f	2026-09-12 21:31:48.052+00
41	1	149	6	c	f	2026-09-12 21:31:50.582+00
48	1	166	13	b	f	2026-09-12 21:31:53.645+00
59	1	218	24	b	f	2026-09-12 21:32:07.908+00
\.


--
-- Data for Name: candidate_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidate_sessions (id, candidate_id, shift_id, socket_id, join_time, end_time, active_seconds, time_remaining_sec, last_active_at, tab_is_active, is_submitted, submitted_at, admin_reopened, admin_reopen_at, score, created_at) FROM stdin;
3	1	1	uudlVT7KfTVY0LmZAAAC	2026-09-12 21:27:53.291236+00	2026-09-12 22:27:53.288+00	60	3353	2026-09-12 21:31:59.719+00	f	t	2026-09-12 21:32:14.873+00	f	\N	2.00	2026-09-12 21:27:53.291236+00
\.


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidates (id, name, roll_no, branch, section, email, token, shift_id, token_used, used_in_shift_id, session_version, created_at) FROM stdin;
2	Priya Nair	21CS002	CSE	A	priya@test.com	456	1	f	\N	1	2026-09-12 13:17:06.708705+00
3	Rahul Singh	21CS003	CSE	B	rahul@test.com	789	1	f	\N	1	2026-09-12 13:17:06.708705+00
4	Ananya Rao	21CS004	CSE	B	ananya@test.com	101	1	f	\N	1	2026-09-12 13:17:06.708705+00
5	Karthik M	21CS005	CSE	A	karthik@test.com	102	1	f	\N	1	2026-09-12 13:17:06.708705+00
6	Divya Reddy	21ECE001	ECE	A	divya@test.com	103	1	f	\N	1	2026-09-12 13:17:06.708705+00
7	Sai Teja	21ECE002	ECE	A	sai@test.com	104	1	f	\N	1	2026-09-12 13:17:06.708705+00
8	Meera Iyer	21ECE003	ECE	B	meera@test.com	105	1	f	\N	1	2026-09-12 13:17:06.708705+00
9	Lakshmi Devi	21ME001	MECH	A	lakshmi@test.com	106	1	f	\N	1	2026-09-12 13:17:06.708705+00
11	Rohan Gupta	21CS006	CSE	A	rohan@test.com	108	2	f	\N	1	2026-09-12 13:17:06.708705+00
12	Sneha Patil	21CS007	CSE	B	sneha@test.com	109	2	f	\N	1	2026-09-12 13:17:06.708705+00
13	Aditya Kumar	21CS008	CSE	A	aditya@test.com	110	2	f	\N	1	2026-09-12 13:17:06.708705+00
14	Harini Suresh	21EEE001	EEE	A	harini@test.com	111	2	f	\N	1	2026-09-12 13:17:06.708705+00
15	Naveen Chandra	21EEE002	EEE	A	naveen@test.com	112	2	f	\N	1	2026-09-12 13:17:06.708705+00
10	Vijay Rajan	21ME002	MECH	B	vijay@test.com	107	1	f	\N	1	2026-09-12 13:17:06.708705+00
1	Arjun Sharma	21CS001	CSE	A	arjun@test.com	123	1	t	1	4	2026-09-12 13:17:06.708705+00
\.


--
-- Data for Name: disqualification_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.disqualification_log (id, team_name, round, violations, candidate_id, reported_at) FROM stdin;
\.


--
-- Data for Name: exam_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_config (id, name, total_duration_min, grace_join_min, questions_per_shift, is_active, created_at, questions_per_candidate, pass_mark_pct, grade_ranges) FROM stdin;
1	GATE Mock Test 2026	60	15	35	t	2026-09-12 13:17:06.708705+00	30	40.00	[]
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, exam_id, topic_id, difficulty, body, option_a, option_b, option_c, option_d, correct_opt, explanation, image_url, is_deleted, created_at, opt_a_image_url, opt_b_image_url, opt_c_image_url, opt_d_image_url, marks, negative_marks) FROM stdin;
1	1	16	medium	Solve for x: 3x + 7 = 31.	8	9	7	10	a	Subtract 7 from both sides to get 3x = 24; dividing by 3 gives x = 8.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
2	1	16	medium	Solve for x: 5x + 4 = 29.	7	5	6	4	b	Subtract 4 from both sides to get 5x = 25; dividing by 5 gives x = 5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
3	1	16	medium	Solve for x: 7x + 9 = 51.	5	8	6	7	c	Subtract 9 from both sides to get 7x = 42; dividing by 7 gives x = 6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
4	1	16	medium	Solve for x: 4x + 11 = 47.	10	8	11	9	d	Subtract 11 from both sides to get 4x = 36; dividing by 4 gives x = 9.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
5	1	16	medium	Solve for x: 6x + 5 = 41.	6	7	5	8	a	Subtract 5 from both sides to get 6x = 36; dividing by 6 gives x = 6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
6	1	16	medium	Solve for x: 8x + 3 = 35.	6	4	5	3	b	Subtract 3 from both sides to get 8x = 32; dividing by 8 gives x = 4.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
7	1	16	medium	Solve for x: 9x + 2 = 38.	3	6	4	5	c	Subtract 2 from both sides to get 9x = 36; dividing by 9 gives x = 4.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
8	1	16	medium	Solve for x: 2x + 13 = 39.	14	12	15	13	d	Subtract 13 from both sides to get 2x = 26; dividing by 2 gives x = 13.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
9	1	16	medium	Solve for x: 11x + 1 = 34.	3	4	2	5	a	Subtract 1 from both sides to get 11x = 33; dividing by 11 gives x = 3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
10	1	16	medium	Solve for x: 5x + 12 = 52.	10	8	9	7	b	Subtract 12 from both sides to get 5x = 40; dividing by 5 gives x = 8.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
11	1	16	medium	If the roots of x² -7x + 12 = 0 are α and β, what is α + β?	12	8	7	-7	c	By Vieta's formula, α + β = -b/a = 7/1 = 7.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
12	1	16	medium	If the roots of x² -9x + 20 = 0 are α and β, what is α + β?	-9	20	10	9	d	By Vieta's formula, α + β = -b/a = 9/1 = 9.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
13	1	16	medium	If the roots of x² -11x + 30 = 0 are α and β, what is α + β?	11	-11	30	12	a	By Vieta's formula, α + β = -b/a = 11/1 = 11.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
14	1	16	medium	If the roots of x² -13x + 40 = 0 are α and β, what is α + β?	14	13	-13	40	b	By Vieta's formula, α + β = -b/a = 13/1 = 13.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
15	1	16	medium	If the roots of x² -10x + 21 = 0 are α and β, what is α + β?	21	11	10	-10	c	By Vieta's formula, α + β = -b/a = 10/1 = 10.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
16	1	16	medium	The 12th term of the arithmetic progression 5, 9, 13, ... is:	45	49	48	53	b	The first term is 5 and common difference is 4, so a₁₂ = 5 + 11(4) = 49.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
17	1	16	medium	Solve for x: 12x + 5 = 53.	3	4	5	6	b	Subtract 5 from both sides to get 12x=48; dividing by 12 gives x=4.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
18	1	16	medium	If log₂(x) = 5, what is x?	32	25	64	16	d	The logarithmic equation means x = 2⁵ = 32.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
19	1	16	medium	For x > 0, if x + 1/x = 5, what is x² + 1/x²?	21	23	25	27	a	Squaring gives x² + 2 + 1/x² = 25, so the required value is 23.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
20	1	16	medium	If 3x - 2 < 10, which is the solution set?	x > 8/3	x < 4	x > 4	x < 8/3	b	Adding 2 gives 3x < 12; dividing by 3 gives x < 4.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
21	1	17	easy	What is the distance between (0,0) and (3,4)?	5	6	7	4	a	Using the distance formula, √(3²+4²) = √25 = 5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
22	1	17	easy	A triangle has base 10 cm and height 6 cm. What is its area?	60 cm²	16 cm²	36 cm²	30 cm²	d	Area = 1/2 × base × height = 1/2 × 10 × 6 = 30 cm².	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
23	1	17	easy	What is the magnitude of vector (6,8)?	14	8	10	12	c	Magnitude = √(6²+8²) = √100 = 10.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
24	1	17	easy	The midpoint of (2,4) and (8,10) is:	(10,14)	(5,7)	(6,8)	(4,6)	b	The midpoint is ((2+8)/2,(4+10)/2) = (5,7).	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
25	1	17	easy	A square has side 9 cm. Its perimeter is:	36 cm	18 cm	27 cm	81 cm	a	A square has four equal sides, so perimeter = 4 × 9 = 36 cm.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
26	1	17	easy	If two parallel lines are cut by a transversal, corresponding angles are:	supplementary	always 90°	always 45°	equal	d	Corresponding angles formed by parallel lines are equal.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
27	1	17	easy	The dot product of (1,2) and (3,4) is:	12	14	11	10	c	(1)(3) + (2)(4) = 3 + 8 = 11.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
28	1	17	easy	A circle has radius 5 cm. Its diameter is:	15 cm	10 cm	5 cm	25 cm	b	Diameter is twice the radius, so 2 × 5 = 10 cm.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
29	1	17	easy	The slope of the line through (1,2) and (3,6) is:	2	3	4	1/2	a	Slope = (6−2)/(3−1) = 4/2 = 2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
30	1	17	easy	A right triangle has legs 5 and 12. Its hypotenuse is:	17	12	10	13	d	By Pythagoras, c = √(25+144) = √169 = 13.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
31	1	17	medium	Find the equation of the line through (2,3) with slope 4.	y=4x−3	y=4x−5	y=4x+5	y=3x−5	b	Using y−3=4(x−2), we get y=4x−5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
32	1	17	medium	If vectors u=(2,1) and v=(4,−2), what is u·v?	8	4	6	10	c	u·v = 2·4 + 1·(−2) = 8−2 = 6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
33	1	17	medium	The angle between two perpendicular vectors is:	0°	45°	180°	90°	d	Perpendicular vectors have zero dot product and meet at 90°.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
34	1	17	medium	A triangle has sides 7, 8, and 9. What is its semiperimeter?	12	24	14	10	a	s=(7+8+9)/2=12.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
35	1	17	medium	Using Heron's formula, the area of a triangle with sides 3,4,5 is:	7.5	6	12	5	b	For a 3-4-5 triangle, area = 1/2·3·4 = 6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
36	1	17	medium	A circle has equation x²+y²−6x+8y−11=0. Its center is:	(6,−8)	(3,4)	(3,−4)	(−3,4)	c	Completing squares gives (x−3)²+(y+4)²=36, so the center is (3,−4).	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
37	1	17	medium	The projection of vector (3,4) on the x-axis has magnitude:	4	5	7	3	d	The x-component is 3, which is the magnitude of its projection on the x-axis.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
38	1	17	medium	If a line has slope 2, the slope of a perpendicular line is:	−1/2	1/2	−2	2	a	For nonvertical perpendicular lines, slopes multiply to −1, so m=−1/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
39	1	17	medium	The area of a parallelogram with adjacent vectors (2,3) and (4,1) is:	12	10	14	8	b	Area = |2·1−3·4| = |2−12| = 10.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
40	1	17	medium	A chord of a circle is 16 cm long and its distance from the center is 6 cm. The radius is:	12 cm	14 cm	10 cm	8 cm	c	Half the chord is 8; radius²=8²+6²=100, so r=10.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
41	1	17	medium	The centroid of triangle vertices (0,0),(6,0),(0,9) is:	(3,2)	(6,9)	(2,6)	(2,3)	d	Centroid is the average of coordinates: (6/3,9/3)=(2,3).	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
42	1	17	medium	A vector of magnitude 5 makes 60° with the positive x-axis. Its x-component is:	2.5	5	5√3/2	√5	a	x-component = 5cos60° = 2.5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
43	1	17	medium	The distance between parallel lines y=3x+2 and y=3x−8 is:	5	√10	10	2√10	b	Distance = |2−(−8)|/√(3²+1²)=10/√10=√10.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
44	1	17	medium	A regular hexagon has side length 4 cm. Its perimeter is:	20 cm	32 cm	24 cm	16 cm	c	A regular hexagon has six equal sides, so perimeter = 6×4=24 cm.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
45	1	17	medium	If a triangle has angles 35° and 65°, the third angle is:	90°	70°	100°	80°	d	Angles of a triangle sum to 180°, so 180−35−65=80°.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
46	1	17	medium	The scalar projection of (6,8) onto (3,4) is:	10	5	8	12	a	Since (6,8)=2(3,4), the scalar projection is 10.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
47	1	17	medium	A sphere has radius 3 cm. Its volume is:	12π cm³	36π cm³	27π cm³	18π cm³	b	V=4/3πr³=4/3π(27)=36π.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
48	1	17	medium	The angle between vectors (1,1) and (1,−1) is:	60°	0°	90°	45°	c	Their dot product is 1−1=0, so they are perpendicular.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
49	1	17	medium	The equation x²+y²=25 represents a circle with:	radius 25	diameter 5	center (5,5)	radius 5	d	Comparing with x²+y²=r² gives r=5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
50	1	17	medium	A rectangle has diagonal 13 cm and one side 5 cm. The other side is:	12 cm	8 cm	10 cm	18 cm	a	By Pythagoras, other side = √(13²−5²)=√144=12.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
51	1	17	hard	For the triangle with vertices (0,0),(4,0),(1,6), what is its area?	18	24	12	10	c	Using the base on the x-axis, area = 1/2·4·6 = 12.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
52	1	17	hard	The distance from point (2,−1) to line 3x+4y−10=0 is:	1/5	2	5	8/5	d	Distance = |3(2)+4(−1)−10|/√(3²+4²)=8/5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
53	1	17	hard	A cone has radius 3 and height 4. Its slant height is:	5	7	4	3	a	Slant height = √(3²+4²)=5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
54	1	17	hard	If |u|=5, |v|=8 and u·v=20, the angle between u and v satisfies cosθ =	2/5	1/2	1/4	3/4	b	cosθ=(u·v)/(|u||v|)=20/(40)=1/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
55	1	17	hard	The locus of points equidistant from (2,0) and (−2,0) is:	x=2	y=2	x=0	y=0	c	Points equidistant from symmetric points on the x-axis lie on the perpendicular bisector x=0.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
56	1	17	hard	A tetrahedron has base area 12 cm² and height 9 cm. Its volume is:	108 cm³	27 cm³	54 cm³	36 cm³	d	Volume = 1/3·base area·height = 1/3·12·9=36.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
57	1	17	hard	The angle between lines with slopes 1 and 3 has tanθ equal to:	1/2	2	1	3/2	a	tanθ=|(3−1)/(1+3)|=2/4=1/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
58	1	17	hard	A parallelogram has diagonals 10 and 24 cm that are perpendicular. Its area is:	34 cm²	120 cm²	240 cm²	60 cm²	b	Area of a rhombus-like orthogonal-diagonal parallelogram = 1/2·d₁d₂=120.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
59	1	17	hard	If plane normal n=(2,−1,2), which vector is parallel to the plane?	(4,−2,4)	(2,0,−1)	(1,2,0)	(2,−1,2)	c	A vector is parallel to the plane when its dot product with n is zero; (1,2,0) gives 2−2+0=0.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
60	1	17	hard	The volume under z=6−x−y in the first octant over x≥0,y≥0 is:	18	12	9	36	d	The base triangle has area 18 and the linear height averages to 2 over the triangular base, giving volume 36.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
61	1	18	medium	If f(x)=x³−5x, then f'(2) is:	19	7	12	−7	b	f'(x)=3x²−5, so f'(2)=12−5=7.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
62	1	18	medium	∫(3x²+4x)dx equals:	x³+4x²+C	x³+2x+C	x³+2x²+C	3x³+2x²+C	c	Integrate termwise: ∫3x²dx=x³ and ∫4xdx=2x².	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
63	1	18	medium	The limit lim(x→2) (x²−4)/(x−2) is:	2	0	6	4	d	Factor x²−4=(x−2)(x+2); the limit is x+2 at x=2, giving 4.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
64	1	18	medium	For f(x)=x²−6x+5, the x-coordinate of its minimum is:	3	6	−3	5	a	f'(x)=2x−6=0 gives x=3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
65	1	18	medium	If y=sin x, then d²y/dx² is:	−cos x	−sin x	sin x	cos x	b	First derivative is cos x; differentiating again gives −sin x.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
66	1	18	medium	∫₀² x dx equals:	4	3	2	1	c	The antiderivative is x²/2; evaluating from 0 to 2 gives 2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
67	1	18	medium	If f'(x)=2x+3 and f(0)=4, then f(2) is:	8	14	12	10	d	f=x²+3x+C; f(0)=4 gives C=4, so f(2)=4+6+4=14.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
68	1	18	medium	The slope of y=x² at x=3 is:	6	3	9	12	a	dy/dx=2x, so at x=3 the slope is 6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
69	1	18	medium	The derivative of ln(x²+1) is:	x/(x²+1)	2x/(x²+1)	1/(x²+1)	2/(x²+1)	b	By the chain rule, derivative = 2x/(x²+1).	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
70	1	18	medium	The average value of f(x)=x on [0,4] is:	1	8	2	4	c	Average value = (1/4)∫₀⁴x dx = (1/4)(8)=2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
71	1	18	hard	Evaluate lim(x→0) (sin 3x)/x.	0	1/3	3	1	c	Write (sin3x)/(3x)·3; the standard limit is 1, so the result is 3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
72	1	18	hard	For f(x)=x⁴−4x², the x-values of local minima are:	−2,2	0,2	−1,1	−√2, √2	d	f'=4x(x²−2), so critical points are 0,±√2; f''=12x²−8 is positive at ±√2, giving minima.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
73	1	18	hard	Evaluate ∫₀¹ x e^(x²) dx.	(e−1)/2	e−1	e/2	1/2	a	Let u=x², du=2x dx. The integral is 1/2∫₀¹e^u du=(e−1)/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
74	1	18	hard	The maximum value of f(x)=x(6−x) is:	18	9	6	12	b	f=6x−x² is a downward parabola with vertex x=3; f(3)=9.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
75	1	18	hard	If y=x^x for x>0, then y' equals:	x^x ln x	x^(x+1)	x^x(ln x+1)	x^(x−1)	c	Log differentiation gives ln y=xlnx; y'/y=lnx+1, so y'=x^x(lnx+1).	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
76	1	18	hard	Evaluate ∫ dx/(1+x²) from 0 to 1.	π/2	1	ln2	π/4	d	The antiderivative is arctan x; arctan1−arctan0=π/4.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
77	1	18	hard	The area enclosed by y=x and y=x² between their intersections is:	1/6	1/3	1/2	2/3	a	Intersections are 0 and 1; area=∫₀¹(x−x²)dx=1/2−1/3=1/6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
78	1	18	hard	For f(x)=ln x / x, the x-coordinate of its maximum on x>0 is:	2	e	1	e²	b	f'=(1−lnx)/x²; setting it to zero gives lnx=1, hence x=e.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
79	1	18	hard	Solve dy/dx = 3y with y(0)=2.	y=2+3x	y=e^(3x)	y=2e^(3x)	y=3e^(2x)	c	The solution is y=Ce^(3x); y(0)=2 gives C=2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
80	1	18	hard	The improper integral ∫₁^∞ 1/x² dx equals:	∞	0	1/2	1	d	Antiderivative is −1/x; from 1 to ∞ it gives 0−(−1)=1.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
81	1	18	hard	For f(x)=x³−3x, the absolute maximum on [−2,2] is:	2	−2	0	4	a	Critical points ±1; f(−1)=2, f(1)=−2, f(−2)=−2, f(2)=2. Thus maximum is 2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
82	1	18	hard	Evaluate ∫₀^(π/2) sin²x dx.	π/8	π/4	π/2	1	b	Using sin²x=(1−cos2x)/2, the cosine term integrates to zero, leaving π/4.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
83	1	18	hard	The radius of convergence of Σ x^n/n! is:	e	0	∞	1	c	The factorial denominator makes the ratio test converge for every real x, so radius is infinite.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
84	1	18	hard	If f'(x)=x/(1+x²), then f(x) can be:	ln(1+x²)+C	x²/(1+x²)+C	arctan x+C	(1/2)ln(1+x²)+C	d	Let u=1+x², du=2x dx; the integral is 1/2 ln(1+x²)+C.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
85	1	18	hard	Evaluate ∫₀¹ ln x dx.	−1	0	1	−1/2	a	An antiderivative is xlnx−x; the boundary limit at 0 is 0, giving −1.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
86	1	18	hard	The differential equation y''+y=0 has general solution:	Ae^x+Be^(−x)	Ax+B	A cosh x+B sinh x	A cos x+B sin x	d	The characteristic equation r²+1=0 has roots ±i, giving y=Acosx+Bsinx.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
87	1	18	hard	Evaluate ∫₀¹ 1/(1+x) dx.	ln2	1	2	1/2	a	The antiderivative is ln(1+x); evaluating from 0 to 1 gives ln2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
88	1	18	hard	For f(x)=x+1/x on x>0, its minimum value is:	4	2	1	0	b	f'=1−1/x²=0 at x=1; f''>0 there and f(1)=2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
89	1	18	hard	The limit lim(x→∞) (3x²+1)/(x²−2) is:	0	∞	3	1	c	Divide numerator and denominator by x²; the lower-order terms vanish, leaving 3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
90	1	18	hard	If f(x)=e^(2x)cos x, then f'(0) is:	1	0	−1	2	d	f'=e^(2x)(2cosx−sinx); at x=0 this equals 2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
91	1	19	medium	If sinθ=3/5 and θ is acute, cosθ is:	1/5	4/5	3/5	5/4	b	Using sin²θ+cos²θ=1, cosθ=4/5 for an acute angle.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
92	1	19	medium	The value of tan45° + sin30° is:	2	1/2	3/2	1	c	tan45°=1 and sin30°=1/2, so the sum is 3/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
93	1	19	medium	Solve 2sin x=√3 for 0≤x≤π.	π/6,5π/6	π/3 only	2π/3 only	π/3, 2π/3	d	sinx=√3/2, which occurs at π/3 and 2π/3 in [0,π].	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
94	1	19	medium	The identity 1+tan²θ equals:	sec²θ	csc²θ	cot²θ	sin²θ	a	This is the standard Pythagorean identity 1+tan²θ=sec²θ.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
95	1	19	medium	If cos A=12/13 and A is acute, tan A is:	13/12	5/12	12/5	5/13	b	sinA=5/13 by the 5-12-13 triangle, so tanA=(5/13)/(12/13)=5/12.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
96	1	19	medium	The period of y=sin(3x) is:	2π	π/3	2π/3	3π	c	For sin(kx), period is 2π/|k|, hence 2π/3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
97	1	19	medium	The value of sin60°cos30° + cos60°sin30° is:	√3/2	1/2	√3	1	d	Using sin(A+B), the expression is sin90°=1.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
98	1	19	medium	If secθ=2, with θ acute, tanθ is:	√3	1	2	1/√3	a	cosθ=1/2, so sinθ=√3/2 and tanθ=√3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
99	1	19	medium	The principal value of sin⁻¹(1/2) is:	π/2	π/6	π/3	5π/6	b	The principal arcsine lies in [−π/2,π/2], and sinπ/6=1/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
100	1	19	medium	If α+β=90°, then tanα tanβ equals:	−1	2	1	0	c	β=90°−α, so tanβ=cotα; their product is 1.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
101	1	19	hard	Solve cos2x=1/2 for 0≤x<2π.	π/6,11π/6	π/3,5π/3	π/6,5π/6,7π/6,11π/6	π/3,2π/3,4π/3,5π/3	c	2x has solutions π/3,5π/3,7π/3,11π/3; dividing by 2 gives the four listed angles in [0,2π).	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
102	1	19	hard	The maximum value of 3sinx+4cosx is:	7	4	3	5	d	The amplitude is √(3²+4²)=5, which is the maximum.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
103	1	19	hard	If tanA=2 and tanB=3, with A+B not an odd multiple of 90°, tan(A+B) is:	−1	5/7	1	6	a	tan(A+B)=(2+3)/(1−2·3)=5/−5=−1.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
104	1	19	hard	Solve sinx+cosx=√2 for 0≤x≤2π.	π/2	π/4	π/4,5π/4	3π/4	b	sinx+cosx=√2 sin(x+π/4); equality requires sin(x+π/4)=1, giving x=π/4.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
105	1	19	hard	If θ satisfies 2cos²θ−3cosθ+1=0, the possible cosθ values are:	1/2,−1	2,1/2	1,1/2	1,2	c	Factor: (2cosθ−1)(cosθ−1)=0, so cosθ=1 or 1/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
106	1	19	hard	The exact value of tan15° is:	√3−1	1/√3	√3	2−√3	d	tan(45°−30°)=(1−1/√3)/(1+1/√3)=2−√3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
107	1	19	hard	For y=sinx+sin2x, y'(0) equals:	3	2	1	0	a	y'=cosx+2cos2x; at 0, y'=1+2=3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
108	1	19	hard	If sinx=cosx, which listed angle in [0,2π) satisfies the equation?	7π/4	π/4	3π/4	5π/4	b	sinx=cosx occurs when x=π/4 or 5π/4 modulo 2π; among the listed angles, π/4 satisfies it.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
109	1	19	hard	The equation 2sin²x−3sinx+1=0 has how many solutions in [0,2π)?	2	1	3	4	c	Factoring gives (2sinx−1)(sinx−1)=0. There are two solutions for sinx=1/2 and one for sinx=1, total 3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
110	1	19	hard	If f(x)=sin⁻¹x, then f'(1/2) is:	1/√3	2	√3/2	2/√3	d	f'(x)=1/√(1−x²); at x=1/2 this is 1/√(3/4)=2/√3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
111	1	20	easy	A fair coin is tossed once. Probability of heads is:	1/4	1/2	1	0	b	There are two equally likely outcomes and one is heads, so probability is 1/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
112	1	20	easy	A fair die is rolled. Probability of getting 4 is:	1/3	1/2	1/6	1/4	c	One of six equally likely faces is 4, so probability is 1/6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
113	1	20	easy	A bag has 3 red and 2 blue balls. Probability of drawing a red ball is:	2/5	1/2	3/2	3/5	d	There are 3 red balls out of 5 total, giving 3/5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
114	1	20	easy	A card is drawn from a standard 52-card deck. Probability it is an ace is:	1/13	1/4	4/13	1/52	a	There are 4 aces among 52 cards, so 4/52=1/13.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
115	1	20	easy	Two fair coins are tossed. Probability of exactly one head is:	1	1/2	1/4	3/4	b	Outcomes HT and TH are favorable out of 4 equally likely outcomes, so 2/4=1/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
116	1	20	medium	Two fair dice are rolled. Probability that their sum is 7 is:	1/9	1/36	1/6	1/12	c	There are 6 ordered pairs summing to 7 out of 36, so 6/36=1/6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
117	1	20	medium	A box contains 5 red and 4 green balls. Two are drawn without replacement. Probability both are red is:	5/36	10/18	1/2	5/18	d	P=5/9×4/8=20/72=5/18.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
118	1	20	medium	If P(A)=0.6, P(B)=0.5 and A,B are independent, P(A∩B) is:	0.3	1.1	0.1	0.6	a	For independent events, P(A∩B)=P(A)P(B)=0.6×0.5=0.3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
119	1	20	medium	A family has two children. Assuming equal boy/girl probability, probability both are girls is:	1/3	1/4	1/2	3/4	b	The equally likely gender sequences are BB,BG,GB,GG; only GG qualifies, so 1/4.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
120	1	20	medium	A number is selected uniformly from 1 to 20. Probability it is divisible by 3 or 5 is:	8/20	6/20	9/20	7/20	c	Multiples of 3 contribute 6, multiples of 5 contribute 4, and 15 is counted twice; union = 6+4−1=9, so 9/20.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
121	1	20	medium	If P(A)=0.7, P(B|A)=0.4, then P(A∩B) is:	0.30	0.40	0.11	0.28	d	P(A∩B)=P(A)P(B|A)=0.7×0.4=0.28.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
122	1	20	medium	A random integer from 1 to 30 is chosen. Probability it is prime is:	1/3	11/30	1/2	7/30	a	There are 10 primes ≤30, so probability is 10/30=1/3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
123	1	20	medium	Three fair coins are tossed. Probability of at least two heads is:	1/4	1/2	3/8	5/8	b	There are C(3,2)+C(3,3)=3+1=4 favorable outcomes out of 8, so 1/2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
124	1	20	medium	A bag has 4 white and 6 black balls. One is drawn, replaced, then another is drawn. Probability both are white is:	8/25	1/5	4/25	2/5	c	Replacement makes draws independent: (4/10)²=4/25.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
125	1	20	medium	If odds in favor of an event are 3:2, its probability is:	2/5	3/2	5/3	3/5	d	Probability = favorable/(favorable+unfavorable)=3/(3+2)=3/5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
126	1	20	hard	If X is binomial with n=5 and p=0.2, P(X=2) is:	0.4096	0.0512	0.16384	0.2048	d	P(X=2)=C(5,2)(0.2)²(0.8)³=10×0.04×0.512=0.2048.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
127	1	20	hard	A fair die is rolled until a 6 appears. The expected number of rolls is:	6	5	1/6	36	a	The waiting time for a success with probability p=1/6 has expectation 1/p=6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
128	1	20	hard	If P(A)=1/2, P(B)=1/3 and P(A∪B)=2/3, then P(A∩B) is:	0	1/6	1/3	1/2	b	P(A∩B)=P(A)+P(B)−P(A∪B)=1/2+1/3−2/3=1/6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
129	1	20	hard	Two cards are drawn without replacement from a 52-card deck. Probability both are kings is:	1/52	1/1326	1/221	1/169	c	P=4/52×3/51=12/2652=1/221.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
130	1	20	hard	A random variable X takes values 0,1,2 with probabilities 0.2,0.5,0.3. Its variance is:	0.7	0.91	0.21	0.49	d	E[X]=1.1 and E[X²]=1.7; variance=1.7−1.1²=0.49.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
131	1	21	easy	In how many ways can 3 distinct books be arranged on a shelf?	12	6	3	9	b	The number of permutations is 3! = 6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
132	1	21	easy	How many ways can 2 students be chosen from 5 students?	5	8	10	20	c	C(5,2)=5·4/2=10.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
133	1	21	easy	How many 2-digit numbers can be formed using 1,2,3 without repetition?	3	9	12	6	d	There are 3 choices for the first digit and 2 for the second: 3×2=6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
134	1	21	easy	How many subsets does a set with 4 elements have?	16	8	12	4	a	A set of n elements has 2ⁿ subsets, so 2⁴=16.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
135	1	21	easy	How many diagonals does a hexagon have?	15	9	6	12	b	Number of diagonals = n(n−3)/2 = 6×3/2=9.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
136	1	21	medium	How many ways can 5 people sit in a row?	24	100	120	60	c	The arrangements are 5! = 120.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
137	1	21	medium	How many ways can 4 students be selected from 9 students?	84	36	72	126	d	C(9,4)=9·8·7·6/(4·3·2·1)=126.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
138	1	21	medium	How many distinct arrangements can be made from the letters of LEVEL?	30	60	20	120	a	LEVEL has 5 letters with L and E each repeated twice; arrangements=5!/(2!2!)=30.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
139	1	21	medium	How many 3-person committees can be formed from 7 people if a particular person must be included?	7	15	21	35	b	Include that person, then choose 2 from the remaining 6: C(6,2)=15.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
140	1	21	medium	How many 4-digit even numbers can be formed from 1,2,3,4,5 without repetition?	60	36	48	24	c	Last digit has 2 choices (2 or 4), then 4·3·2 choices for the other positions: 48.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
141	1	21	medium	In how many ways can 3 identical balls be distributed among 4 distinct boxes, allowing empty boxes?	12	16	24	20	d	Stars and bars gives C(3+4−1,4−1)=C(6,3)=20.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
142	1	21	medium	How many solutions in positive integers satisfy x+y+z=8?	21	28	15	35	a	Positive solutions equal C(7,2)=21 after setting x'=x−1 etc.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
143	1	21	medium	How many ways can 6 people sit around a circular table, considering rotations identical?	60	120	720	24	b	Circular arrangements of 6 distinct people are (6−1)! = 120.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
144	1	21	medium	How many 5-letter strings can be formed from A,B,C,D,E without repetition and starting with A?	20	60	24	120	c	Fix A first; the remaining four letters can be arranged in 4!=24 ways.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
145	1	21	medium	How many ways can a president and secretary be chosen from 8 people?	28	16	64	56	d	The roles are distinct, so 8 choices for president and 7 for secretary: 56.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
146	1	21	hard	How many distinct arrangements can be made from the letters of MISSISSIPPI?	11550	17325	46200	34650	d	MISSISSIPPI has 11 letters with I=4,S=4,P=2,M=1; arrangements=11!/(4!4!2!)=34650.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
147	1	21	hard	How many onto functions exist from a 4-element set to a 3-element set?	36	81	24	48	a	By inclusion-exclusion: 3⁴−C(3,1)2⁴+C(3,2)1⁴=81−48+3=36.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
148	1	21	hard	How many ways can 5 married couples be seated in a row so that no couple sits together?	1263360	112320	134400	120960	b	Treat each married couple as a block for inclusion-exclusion, with 2 internal orders per selected block: Σ(−1)^k C(5,k)2^k(10−k)! = 1,263,360.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
149	1	21	hard	How many integer solutions satisfy x1+x2+x3+x4=12 with xi≥0?	364	560	455	220	c	Stars and bars gives C(15,3)=455.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
150	1	21	hard	How many ways can 8 people be divided into two unlabeled groups of 4?	70	56	16	35	d	Choose 4 for one group and divide by 2 for unlabeled groups: C(8,4)/2=35.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
151	1	24	easy	A train travels 120 km in 2 hours. Its average speed is:	40 km/h	60 km/h	50 km/h	80 km/h	b	Average speed = distance/time = 120/2 = 60 km/h.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
152	1	24	easy	The ratio 3:5 is equivalent to:	15:20	6:15	12:20	9:20	c	Multiplying both terms by 4 gives 12:20.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
153	1	24	easy	If 20% of a number is 30, the number is:	120	180	100	150	d	0.2x=30, so x=150.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
154	1	24	medium	A shop gives a 10% discount on an item marked ₹800. The selling price is:	₹780	₹700	₹720	₹740	c	Discount = ₹80, so selling price = ₹800−₹80=₹720.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
155	1	24	medium	A can complete a job in 12 days and B in 18 days. Working together, they finish it in:	6 days	15 days	30/7 days	36/5 days	d	Combined rate = 1/12+1/18=5/36, so time=36/5 days.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
156	1	24	medium	A sum of ₹5000 earns simple interest at 8% per annum for 2 years. Interest is:	₹800	₹400	₹900	₹1000	a	SI=PRT/100=5000×8×2/100=₹800.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
157	1	24	medium	If 5x−3=2x+18, x equals:	6	7	5	9	b	3x=21, so x=7.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
158	1	24	medium	A cyclist covers 15 km at 10 km/h and another 15 km at 15 km/h. Total time is:	3 h	1.5 h	2.5 h	2 h	c	Time=15/10+15/15=1.5+1=2.5 h.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
159	1	24	medium	The average of 8, 12, 15, 17 and x is 14. Find x.	16	20	14	18	d	The required total is 5×14=70; known sum is 52, so x=18.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
160	1	24	medium	A number is increased by 25% and then decreased by 20%. The net change is:	0%	5% increase	5% decrease	10% increase	a	1.25×0.8=1, so the final value equals the original.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
161	1	24	medium	If 4 workers make 80 units in 5 days at the same rate, 6 workers make how many units in 5 days?	160	120	100	96	b	Output is proportional to workers: 80×6/4=120.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
162	1	24	hard	A boat travels 24 km downstream in 2 h and the same distance upstream in 3 h. The speed of the boat in still water is:	12 km/h	11 km/h	9 km/h	10 km/h	d	Downstream speed=12, upstream=8; still-water speed=(12+8)/2=10.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
163	1	24	hard	A and B invest ₹40,000 and ₹60,000 for 8 and 6 months respectively. Their profit-sharing ratio is:	8:9	4:3	16:9	9:8	a	Capital-time products are 40000×8 and 60000×6, giving 320000:360000=8:9.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
164	1	24	hard	A number leaves remainder 5 when divided by 7. What remainder does its square leave when divided by 7?	2	4	5	1	b	The square is congruent to 5²=25≡4 (mod 7).	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
165	1	24	hard	If x+y=10 and xy=21, then x³+y³ is:	580	210	370	790	c	x³+y³=(x+y)³−3xy(x+y)=1000−630=370.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
166	1	24	hard	A pipe fills a tank in 8 h while another empties it in 12 h. If both are opened, the tank fills in:	20 h	4.8 h	10 h	24 h	d	Net rate=1/8−1/12=1/24, so time=24 h.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
167	1	24	hard	A 30 L mixture contains milk and water in ratio 2:3. How much milk must be added to make the ratio 1:1?	10 L	12 L	15 L	8 L	a	Initially milk=12 L, water=18 L. Add x milk: 12+x=18, so x=6 L.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
168	1	24	hard	A man spends 75% of his income. If his income rises 20% and expenditure rises 10%, his savings rise by:	40%	50%	20%	30%	b	Let income=100, expenditure=75, savings=25. New income=120, expenditure=82.5, savings=37.5, a 50% rise.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
169	1	25	easy	Choose the word closest in meaning to 'abundant'.	ancient	plentiful	scarce	fragile	b	Abundant means available in large quantities, or plentiful.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
170	1	25	easy	Choose the correctly spelled word.	accomodation	accommadation	accommodation	acommodation	c	The standard spelling is accommodation.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
171	1	25	medium	Choose the grammatically correct sentence.	Neither answers is correct.	Neither of answer are correct.	Neither of the answers is correct.	Neither of the answers are correct.	c	'Neither' is singular in standard formal usage, so it takes 'is'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
172	1	25	medium	The antonym of 'meticulous' is:	precise	thorough	methodical	careless	d	Meticulous means very careful and precise; its opposite is careless.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
173	1	25	medium	Fill in the blank: She is good ___ solving puzzles.	at	in	on	for	a	The standard collocation is 'good at'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
174	1	25	medium	Choose the sentence with correct subject-verb agreement.	The list of items were on the desk.	The list of items is on the desk.	The list of items are on the desk.	The lists of item is on the desk.	b	The subject is singular 'list', so the verb is 'is'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
175	1	25	medium	Choose the best synonym for 'pragmatic'.	reckless	theoretical	practical	idealistic	c	Pragmatic describes an approach focused on practical results.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
176	1	25	medium	Identify the correctly punctuated sentence.	After dinner we, went for a walk.	After, dinner we went for a walk.	After dinner we went, for a walk.	After dinner, we went for a walk.	d	A comma correctly follows the introductory phrase 'After dinner'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
177	1	25	medium	Fill in the blank: If I ___ you, I would accept the offer.	were	was	am	be	a	The subjunctive form 'were' is used in the hypothetical 'If I were you'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
178	1	25	medium	Choose the word that best completes: The evidence was ___ to support the claim.	suffice	insufficient	insufficiency	insufficiently	b	'Insufficient' is the adjective modifying 'evidence'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
179	1	25	hard	Choose the best revision: 'Having finished the report, the meeting was started.'	Having finished the report, the meeting started the team.	The meeting, having finished the report, was started by it.	The report having finished, the meeting was started.	Having finished the report, the team started the meeting.	d	The introductory participial phrase must logically modify the people who finished the report.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
180	1	25	hard	In the sentence 'The committee, along with its chairperson, has approved the proposal,' why is 'has' correct?	The grammatical subject is singular 'committee'.	'Chairperson' is the main subject.	'Along with' makes both nouns plural.	The proposal controls the verb.	a	The phrase 'along with its chairperson' is parenthetical; the subject 'committee' is singular.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
181	1	25	hard	Choose the sentence with the correct use of 'affect/effect'.	The new policy will effected productivity.	The new policy will affect productivity.	The new policy will effect productivity.	The new policy will affect on productivity.	b	'Affect' is normally the verb meaning to influence; 'effect' is commonly a noun meaning result.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
182	1	25	hard	Choose the best meaning of 'equivocal'.	highly emotional	mathematically exact	ambiguous or open to more than one interpretation	completely certain	c	Equivocal statements are ambiguous or deliberately noncommittal.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
183	1	25	hard	Select the sentence that is free of a dangling modifier.	While driving to work, the radio announced the news.	Driving to work, the news was heard by me.	While the news was driving, I heard the radio.	While driving to work, I heard the news on the radio.	d	The understood subject of 'driving' is 'I', matching the main clause.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
184	1	25	hard	Choose the most concise version: 'Due to the fact that the test was difficult, many students left early.'	Because the test was difficult, many students left early.	Due to the test being difficult, many students left early.	The test was difficult, and due to this fact many students left early.	On account of the fact of difficulty, many students left early.	a	'Because' conveys the same meaning more directly and concisely.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
185	1	25	hard	Which inference is best supported? 'The library extended its hours during examinations, and attendance doubled.'	Examinations became twice as difficult.	The extended hours may have contributed to increased attendance.	All students prefer studying at night.	The library doubled its staff.	b	The statement supports a possible association, not the stronger claims.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
186	1	25	hard	Choose the sentence in which 'disinterested' is used correctly.	The judge was disinterested in receiving a salary.	The judge became disinterested after reading the case.	The judge remained disinterested and impartial throughout the trial.	The judge was disinterested because he was bored by the trial.	c	Disinterested traditionally means impartial or unbiased; 'uninterested' means lacking interest.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
187	1	26	easy	A sequence follows 2, 4, 8, 16, __. What comes next?	36	32	24	30	b	Each term is multiplied by 2, so the next term is 32.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
188	1	26	easy	Which number completes the pattern 3, 6, 11, 18, __?	29	30	27	25	c	The differences are 3,5,7; the next difference is 9, giving 27.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
189	1	26	medium	Find the next term: 5, 10, 20, 40, __.	70	100	80	60	c	Each term doubles, so the next term is 80.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
190	1	26	medium	Find the odd one out: 16, 25, 36, 49, 63.	25	36	49	63	d	16,25,36,49 are perfect squares; 63 is not.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
191	1	26	medium	A pattern maps 2→6, 3→12, 4→20, 5→30. Then 6→?	42	36	40	48	a	The mapping is n(n+1), so 6×7=42.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
192	1	26	medium	Complete the sequence: AZ, BY, CX, DW, __.	EW	EV	EU	FV	b	The first letter moves forward and the second moves backward: E and V.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
193	1	26	medium	If MONDAY is coded as NPOEBZ by shifting each letter one step forward, TUESDAY is:	TVFTEBZ	UVGTEBZ	UVFTEBZ	UVFTEAZ	c	Shift each letter of TUESDAY forward by one alphabet position.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
194	1	26	medium	A cube is painted on all faces and cut into 27 equal small cubes. How many small cubes have exactly two painted faces?	8	6	24	12	d	For an n×n×n cube, edge cubes excluding corners with exactly two faces total 12(n−2)=12.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
195	1	26	medium	A sequence alternates +3 and ×2: 4, 7, 14, 17, 34, __.	37	68	31	40	a	Applying +3 then ×2 repeatedly gives 34+3=37.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
196	1	26	hard	A sequence is defined by a₁=2 and aₙ₊₁=2aₙ+1. What is a₄?	19	17	25	23	d	a₂=5, a₃=11, a₄=23.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
197	1	26	hard	A 3×3×3 cube is painted on the outside and cut into unit cubes. How many have exactly one painted face?	6	12	8	18	a	Exactly one painted face occurs at the center of each face: 6(n−2)²=6.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
198	1	26	hard	In the sequence 1, 4, 10, 22, 46, __, each term is twice the previous term plus 2. Next term is:	98	94	92	96	b	46×2+2=94.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
199	1	26	hard	A matrix-like pattern has row sums 6, 12, 24, 48. If the rule doubles each row sum, the next is:	84	108	96	72	c	The sums double each time, so 48×2=96.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
200	1	26	hard	A code changes each digit d to (d+3) mod 10. Under this rule, 5807 becomes:	8137	8520	6130	8130	d	5→8, 8→1, 0→3, 7→0, giving 8130.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
201	1	26	hard	A figure sequence has 1, 3, 6, 10, 15 objects. How many objects are in the next figure if the same pattern continues?	21	20	22	24	a	The differences are 2,3,4,5; the next difference is 6, giving 21.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
202	1	26	hard	If a clock face pattern assigns 12→1, 3→2, 6→3, 9→4, then 1→?	3	5	4	6	b	The positions advance in quarter-turns: 12,3,6,9 map to 1,2,3,4; the next hour position 1 maps to 5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
203	1	26	hard	Find the missing term: 2, 6, 12, 20, 30, __.	44	48	42	40	c	Terms are n(n+1): 1×2,2×3,...,6×7=42.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
204	1	27	easy	A 10 L mixture contains milk and water in the ratio 1:1. Amount of milk is:	10 L	5 L	4 L	6 L	b	Equal ratio means half the mixture is milk: 10/2=5 L.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
205	1	27	easy	How much water should be added to 10 L pure milk to make milk:water = 2:1?	2 L	20 L	5 L	10 L	c	For a 2:1 ratio, 10 L milk corresponds to 5 L water.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
206	1	27	medium	A 40 L mixture has milk:water=3:1. How much water must be added to make the ratio 3:2?	5 L	20 L	10 L	15 L	c	Milk=30 L and water=10 L. For 3:2, water must be 20 L, so add 10 L.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
207	1	27	medium	A solution is 20% acid. How much pure acid should be added to 10 L to make it 30% acid?	2 L	1 L	5/3 L	10/7 L	d	Initial acid=2 L. (2+x)/(10+x)=0.3 gives x=10/7 L.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
208	1	27	medium	A 60 kg alloy contains copper and zinc in ratio 2:1. How much zinc is present?	20 kg	30 kg	40 kg	15 kg	a	Zinc is one of three equal parts: 60/3=20 kg.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
209	1	27	medium	Tea costing ₹240/kg is mixed with tea costing ₹360/kg to obtain a mixture worth ₹300/kg. Ratio of cheaper to dearer tea is:	3:2	1:1	2:1	1:2	b	By alligation, cheaper:dearer=(360−300):(300−240)=60:60=1:1.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
210	1	27	medium	A 50 L mixture contains 40% alcohol. How much water should be added to reduce concentration to 25%?	25 L	15 L	30 L	20 L	c	Alcohol=20 L. For 25%, total volume must be 80 L, so add 30 L water.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
211	1	27	medium	A vessel has 30 L solution at 60% acid. How much solution must be removed and replaced with water to make it 40% acid?	8 L	12 L	15 L	10 L	d	Removing x L removes 0.6x acid. Need 18−0.6x=12, so x=10 L.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
212	1	27	medium	Rice at ₹40/kg is mixed with rice at ₹60/kg in ratio 3:2. Average price is:	₹48/kg	₹50/kg	₹52/kg	₹44/kg	a	Weighted average=(3×40+2×60)/5=48.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
213	1	27	hard	A 100 L solution is 30% salt. How much water must evaporate to make it 40% salt?	20 L	30 L	15 L	25 L	d	Salt remains 30 L. At 40%, total volume must be 75 L, so 25 L water evaporates.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
214	1	27	hard	A 40 L mixture of milk and water is in ratio 5:3. How much mixture should be replaced by water to make the ratio 5:4?	40/9 L	5 L	8 L	10/3 L	a	Milk=25 L. If x is replaced, milk remains 25(1−x/40), water becomes 15(1−x/40)+x; setting ratio 5:4 gives x=40/9 L.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
215	1	27	hard	Two alloys contain copper:zinc as 3:2 and 5:3. In what ratio should they be mixed to obtain 8:5 copper:zinc?	3:5	5:8	1:2	2:1	b	Copper fractions are 3/5 and 5/8; target copper fraction is 8/13. Alligation gives (5/8−8/13):(8/13−3/5)=5:8.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
216	1	27	hard	A 25% acid solution is mixed with a 60% acid solution to get 40%. Ratio of first to second solution is:	5:3	2:1	4:3	3:4	c	By alligation, first:second=(60−40):(40−25)=20:15=4:3.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
217	1	27	hard	A tank contains 80 L mixture with 25% alcohol. 20 L is removed and replaced with pure alcohol. New alcohol percentage is:	40%	50%	37.5%	43.75%	d	Initial alcohol=20 L; removing 20 L removes 5 L, leaving 15 L. Add 20 L alcohol gives 35/80=43.75%.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
218	1	27	hard	A 70 L mixture has milk:water=4:3. How much mixture must be replaced with water to make the ratio 2:3?	21 L	20 L	15 L	10 L	a	Initially milk=40 L. Removing x L removes 4x/7 milk; the target milk amount is 28 L, so 40−4x/7=28, giving x=21 L.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
219	1	27	hard	A metal alloy is 40% copper. How much pure copper must be added to 50 kg alloy to make it 55% copper?	25/9 kg	50/3 kg	10 kg	5 kg	b	Initial copper=20 kg. (20+x)/(50+x)=0.55 gives 20+x=27.5+0.55x, so x=50/3 kg.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
220	1	24	easy	A shopkeeper buys an item for ₹500 and sells it at a 10% profit. The selling price is:	₹550	₹540	₹600	₹525	a	Profit = 10% of ₹500 = ₹50, so selling price = ₹550.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
221	1	23	easy	Choose the synonym of 'rapid'.	distant	quick	silent	heavy	b	Rapid means quick or fast.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
222	1	23	easy	Choose the antonym of 'expand'.	contract	increase	extend	enlarge	a	Contract means to become smaller, opposite of expand.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
223	1	23	easy	Fill in the blank: He arrived ___ the station at 8 a.m.	on	in	by	at	d	The preposition 'at' is used with a specific point such as a station.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
224	1	23	easy	Choose the correctly spelled word from the following options.	seperrate	seperete	separate	seperate	c	The correct spelling is separate.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
225	1	23	easy	Choose the correct plural of 'criterion'.	criteriones	criteria	criterions	criterias	b	The traditional plural of criterion is criteria.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
226	1	23	easy	Choose the correct sentence.	She has completed the work.	She have completed the work.	She completed has the work.	She having completed the work.	a	The singular subject 'she' takes 'has'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
227	1	23	easy	The word 'benevolent' most nearly means:	hostile	uncertain	careless	kind	d	Benevolent means well-meaning and kind.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
228	1	23	easy	Fill in the blank: I have lived here ___ 2020.	from	by	since	for	c	'Since' is used with a starting point in time.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
229	1	23	easy	Choose the noun form of 'decide'.	decided	decision	decisive	deciding	b	Decision is the noun corresponding to decide.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
230	1	23	easy	Choose the correct article: He is ___ honest man.	an	a	the	no article	a	'Honest' begins with a vowel sound, so 'an' is used.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
231	1	23	easy	Choose the word closest to 'fragile'.	durable	massive	rigid	delicate	d	Fragile means easily broken or delicate.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
232	1	23	easy	Choose the correct tense: By next week, she ___ the project.	finished	has finish	will have finished	finishes	c	The future perfect expresses an action completed before a future time.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
233	1	23	easy	Choose the correct preposition: The keys are ___ the table.	for	on	at	to	b	A physical object resting on a surface is 'on' the table.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
234	1	23	easy	Choose the antonym of 'scarce'.	abundant	limited	rare	insufficient	a	Abundant means plentiful, opposite of scarce.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
235	1	23	easy	Choose the correctly formed comparative.	efficienter	most efficienter	more efficientest	more efficient	d	For the adjective 'efficient', the standard comparative is 'more efficient'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
236	1	23	medium	Choose the grammatically correct sentence showing proper subject-verb agreement.	Each players has a locker.	Each of players have a locker.	Each of the players has a locker.	Each of the players have a locker.	c	'Each' is singular, so it takes 'has'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
237	1	23	medium	Select the best synonym for 'alleviate'.	predict	reduce	intensify	ignore	b	Alleviate means to make something less severe or reduce it.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
238	1	23	medium	Choose the correct reported speech: Ravi said, 'I am tired.'	Ravi said that he was tired.	Ravi said that I am tired.	Ravi says that he was tired.	Ravi said that he is tired yesterday.	a	With a past reporting verb, the present 'am' normally backshifts to 'was'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
239	1	23	medium	Choose the correct passive form: 'They will announce the results tomorrow.'	The results are announced tomorrow.	The results were announced tomorrow.	The results will announce tomorrow.	The results will be announced tomorrow.	d	The object becomes the subject, with future passive 'will be announced'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
240	1	23	medium	Fill in the blank: No sooner had the train arrived ___ the passengers rushed in.	then	and	than	when	c	The standard correlative construction is 'no sooner ... than'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
241	1	23	medium	Choose the word that best fits: His explanation was so ___ that nobody understood the procedure.	lucid	ambiguous	transparent	explicit	b	Ambiguous means open to multiple interpretations.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
242	1	23	medium	Identify the sentence with the correct use of 'fewer'.	There were fewer errors this time.	There was fewer traffic this morning.	We need fewer water.	She has fewer patience today.	a	'Fewer' is used with countable plural nouns such as errors.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
243	1	23	medium	Choose the best completion: If she had studied harder, she ___ the exam.	will pass	would pass	passes	would have passed	d	This is a third conditional: if + past perfect, would have + past participle.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
244	1	23	medium	Choose the sentence with correct parallelism.	The job requires planning, to test, and documenting.	The job requires to plan, testing, and documenting.	The job requires planning, testing, and documenting.	The job requires planning, testing, and to document.	c	All three items are gerunds, maintaining parallel structure.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
245	1	23	medium	Choose the antonym of 'transient'.	fleeting	permanent	brief	temporary	b	Transient means temporary; permanent is its opposite.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
246	1	23	medium	Choose the best meaning of 'corroborate'.	confirm with evidence	contradict completely	remove from a list	make less precise	a	To corroborate is to support or confirm a claim with evidence.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
247	1	23	medium	Fill in the blank: The manager is responsible ___ preparing the report.	to	of	with	for	d	The standard construction is 'responsible for'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
248	1	23	medium	Choose the correctly punctuated sentence.	My brother, who lives in Pune is an engineer.	My brother who lives, in Pune is an engineer.	My brother, who lives in Pune, is an engineer.	My brother who lives in Pune, is an engineer.	c	A nonrestrictive relative clause is set off by commas on both sides.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
249	1	23	medium	Choose the best replacement for 'very unique'.	more unique	unique	extremely unique	most unique	b	Unique traditionally means one of a kind, so an absolute adjective does not need 'very'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
250	1	23	medium	Which sentence uses 'principal' correctly?	The school principal addressed the students.	The school principle addressed the students.	The school principal of physics is difficult.	The principal reason was a school principal.	a	Principal means head of a school; principle means a rule or belief.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
251	1	23	medium	Choose the best word: The scientist's conclusion was based on ___ evidence.	imaginary	irrelevant	accidental	empirical	d	Empirical evidence is based on observation or experiment.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
252	1	23	medium	Choose the correct inversion: 'Rarely ___ such a difficult problem.'	did I have encountered	I encountered have	have I encountered	I have encountered	c	Negative adverbs such as 'rarely' trigger auxiliary-subject inversion.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
253	1	23	medium	Choose the sentence that avoids ambiguity.	After meeting her, Maya gave her the report.	When Maya met Priya, Maya gave her the report.	When Maya met Priya, she gave her the report.	Maya gave Priya her report after she met her.	b	Repeating 'Maya' removes ambiguity about who performed the action.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
254	1	23	medium	Choose the best synonym for 'scrutinize'.	examine closely	ignore	summarize briefly	approve automatically	a	Scrutinize means to examine something carefully and closely.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
255	1	23	medium	Fill in the blank: The proposal was rejected ___ its potential benefits.	because	unless	whereas	despite	d	'Despite' correctly introduces a contrast with the rejection.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
256	1	23	hard	Choose the grammatically correct sentence involving a pronoun complement.	It is I who is responsible for the decision.	It is me who am responsible for the decision.	It is I who am responsible for the decision.	It is me who are responsible for the decision.	c	In formal usage, 'I' is the subject complement and 'who' refers to I, taking 'am'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
257	1	23	hard	Choose the best revision: 'The data suggests that the method is reliable.'	The data suggesting that the method is reliable.	The data suggest that the method is reliable.	The data suggests that the method are reliable.	The datas suggest that the method is reliable.	b	In formal scientific usage, data is treated as a plural noun, so 'suggest' is preferred.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
258	1	23	hard	Which sentence correctly uses the subjunctive mood?	The committee recommended that he be appointed.	The committee recommended that he is appointed.	The committee recommended that he was appointed.	The committee recommended that he has appointed.	a	After verbs such as recommend, formal English uses the mandative subjunctive 'be appointed'.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
259	1	23	hard	Choose the best interpretation: 'Only after the audit did the company discover the discrepancy.'	The audit occurred after the discrepancy was discovered.	The company discovered every discrepancy before the audit.	The audit caused the discrepancy.	The discrepancy was discovered after the audit, not before it.	d	The inversion emphasizes that discovery occurred only after the audit.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
260	1	23	hard	Choose the sentence with correct logical comparison.	The new processor is faster than the old processor.	The new processor is faster than the old.	The new processor is faster than the old one.	The new processor is faster than the old processor was.	c	'The old one' clearly represents the item being compared and avoids ambiguity.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
261	1	23	hard	Select the best word: The witness gave an ___ account that contained several contradictions.	unanimous	incoherent	infallible	immutable	b	An incoherent account lacks logical consistency and may contain contradictions.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
262	1	23	hard	Choose the sentence with the most precise modifier placement.	She almost completed all the questions.	She completed almost all the questions.	Almost she completed all the questions.	She completed all almost the questions.	a	'Almost all' correctly modifies the quantity of questions completed.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
263	1	23	hard	Choose the best completion: Had the warning been heeded, the accident ___.	might be avoided	will have been avoided	is avoided	might have been avoided	d	This inverted third conditional refers to an unreal past condition and result.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
264	1	23	hard	Choose the sentence in which 'that' is correctly used.	The book that, you recommended was excellent.	The book you recommended that was excellent.	The book that you recommended was excellent.	The book, that you recommended, was excellent.	c	The restrictive relative clause 'that you recommended' does not take commas.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
265	1	23	hard	Which sentence best preserves the intended meaning? 'Despite being exhausted, the report was completed by Anita.'	Anita was completed by the report despite exhaustion.	Although Anita was exhausted, she completed the report.	Although the report was exhausted, Anita completed it.	The report completed Anita despite exhaustion.	b	The introductory phrase logically modifies Anita, the person who was exhausted.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
266	1	23	hard	Choose the most formal replacement for 'a lot of problems'.	numerous problems	a bunch of problems	loads of problems	tons of problems	a	'Numerous problems' is concise and appropriately formal.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
267	1	23	hard	Choose the correct sentence using a restrictive clause.	Students, who submit late work, may lose marks.	Students who, submit late work may lose marks.	Students, who submit late work may lose marks.	Students who submit late work may lose marks.	d	The clause identifies which students are meant, so it is restrictive and takes no commas.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
268	1	23	hard	Choose the best synonym for 'intransigent'.	deeply confused	temporarily absent	unwilling to compromise	highly adaptable	c	Intransigent describes someone unwilling to change a position or compromise.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
269	1	23	hard	Choose the sentence with correct tense sequence.	She said that she finishing the assignment.	She said that she had finished the assignment.	She said that she has finished the assignment yesterday.	She said that she finishes the assignment.	b	The earlier completed action is naturally expressed with past perfect after the past reporting verb.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
270	1	23	hard	Which sentence is logically strongest?	The results are consistent with the hypothesis, but they do not prove it.	The results prove the hypothesis beyond any possible doubt.	The hypothesis must be true because one experiment supported it.	The results make alternative explanations impossible.	a	Scientific evidence can support a hypothesis without necessarily proving it conclusively.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
271	1	22	medium	What is the output of `int x=5; printf("%d", x++);`?	4	undefined	5	6	c	Post-increment yields the current value 5, then increments x.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
272	1	22	medium	What is the value of `sizeof(char)` in standard C?	8	1	2	4	b	The C standard defines sizeof(char) as 1 byte.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
273	1	22	medium	Which declaration creates a pointer to an integer?	int *p;	int p*;	pointer int p;	int &p;	a	The asterisk in `int *p` declares p as a pointer to int.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
274	1	22	medium	What does `strcmp("abc","abc")` return?	1	-1	3	0	d	strcmp returns zero when the two strings are equal.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
275	1	22	medium	What is the output of `printf("%d", 10/4);` for integer operands?	3	0	2	2.5	c	Integer division truncates the fractional part, so 10/4 is 2.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
276	1	22	medium	Which storage class gives a local variable automatic storage by default?	register	auto	static	extern	b	Local variables have automatic storage duration by default; `auto` explicitly names that class.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
277	1	22	medium	What is the output of `int a[3]={10,20,30}; printf("%d", *(a+1));`?	20	10	30	address	a	a+1 points to a[1], whose value is 20.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
278	1	22	medium	Which function is used to dynamically allocate memory in C?	alloc	new	memalloc	malloc	d	malloc allocates a requested number of bytes from the heap.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
279	1	22	medium	If `int x=7; int *p=&x;`, what does `*p=12;` do?	creates a new pointer	causes a syntax error	changes x to 12	changes p to 12	c	Dereferencing p accesses x, so assigning 12 changes x to 12.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
280	1	22	medium	What is the output of `printf("%d", 3>2 && 2>1);`?	3	1	0	2	b	Both comparisons are true; logical AND of true operands is 1.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
281	1	22	medium	Which operator has higher precedence in `a+b*c`?	*	+	=	&&	a	Multiplication has higher precedence than addition.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
282	1	22	medium	What does `break` do inside a loop?	skips only the current iteration	restarts the loop	exits the program always	immediately exits the loop	d	break terminates the nearest enclosing loop or switch.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
283	1	22	medium	What is the output of `int x=3; if(x) printf("yes"); else printf("no");`?	3	nothing	yes	no	c	Any nonzero integer is true in a C condition, so 'yes' is printed.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
284	1	22	medium	Which header declares `printf`?	math.h	stdio.h	stdlib.h	string.h	b	printf is declared in the standard input/output header stdio.h.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
285	1	22	medium	What is the result of `5 % 2` in C?	1	2	2.5	0	a	The remainder after integer division of 5 by 2 is 1.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
286	1	22	medium	Which statement correctly declares an array of 10 integers?	int a(10);	array int a[10];	int[10] a;	int a[10];	d	C array declarations place the size in brackets after the variable name.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
287	1	22	medium	What is the output of `for(int i=0;i<3;i++) printf("%d",i);`?	001122	321	012	123	c	i takes values 0, 1, and 2, producing 012.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
288	1	22	medium	What does a function declared `void f(void)` indicate?	it takes any number of arguments	it takes no arguments and returns no value	it takes one void pointer	it returns an int	b	The parameter list `(void)` means no parameters, and void return type means no value is returned.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
289	1	22	medium	Which is the correct way to compare two C strings?	strcmp(s1,s2)==0	s1==s2	s1.equals(s2)	compare(s1,s2)	a	strcmp compares string contents; equality returns zero.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
290	1	22	medium	What does `const int x=5;` prevent?	reading x	declaring x	using x in expressions	modifying x through its identifier	d	const makes the object non-modifiable through the declared object expression.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
291	1	22	medium	What is the output of `int x=2; printf("%d", x<<2);`?	6	16	8	4	c	Left shifting 2 by 2 positions multiplies it by 4 for this representable value, giving 8.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
292	1	22	medium	Which statement about `static` local variables is correct?	they cannot be modified	they retain their value between function calls	they are reinitialized on every call	they must be global	b	A static local variable has lifetime for the entire program and retains its stored value between calls.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
293	1	22	medium	What is the output of `printf("%c", 'A'+2);`?	C	B	D	65	a	Character constants participate in integer arithmetic; 'A'+2 corresponds to 'C' in the basic execution character set.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
294	1	22	medium	Which expression accesses the third element of `int a[5]`?	a[3]	a[1]	a[5]	a[2]	d	C arrays are zero-indexed, so the third element is a[2].	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
295	1	22	medium	What does `realloc` generally do?	frees every allocated block	creates a file	changes the size of a previously allocated memory block	initializes all memory to zero	c	realloc attempts to resize an existing dynamically allocated block.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
296	1	22	medium	What is the output of `int x=4; printf("%d", ++x);`?	6	5	4	3	b	Pre-increment increments x first, so the printed value is 5.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
297	1	22	medium	Which keyword is used to return a value from a function?	return	yield	send	output	a	The return statement terminates the function and can provide a value to its caller.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
298	1	22	medium	If `int a=5,b=2;` what is the value of `a%b`?	2	2.5	0	1	d	5 divided by 2 leaves remainder 1.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
299	1	22	medium	Which loop is guaranteed to execute its body at least once?	for	none	do-while	while	c	A do-while checks its condition after executing the body.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
300	1	22	medium	What is the output of `int x=10; printf("%d", x==10);`?	true	1	10	0	b	The equality comparison is true, and C represents true as integer 1 in this context.	\N	f	2026-09-12 20:35:37.852417+00	\N	\N	\N	\N	1.00	0.00
\.


--
-- Data for Name: results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.results (id, candidate_id, shift_id, score, total_questions, correct_count, wrong_count, skipped_count, time_taken_sec, submitted_at, synced_to_cloud, percentage, grade, pass_fail, total_marks) FROM stdin;
2	1	1	2.00	35	2	3	30	60	2026-09-12 21:32:14.873+00	f	5.710	\N	fail	35.00
\.


--
-- Data for Name: shift_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shift_questions (id, shift_id, question_id) FROM stdin;
91	1	5
92	1	17
93	1	7
94	1	43
95	1	56
96	1	55
97	1	67
98	1	76
99	1	73
100	1	96
101	1	110
102	1	101
103	1	116
104	1	126
105	1	129
106	1	143
107	1	149
108	1	147
109	1	273
110	1	271
111	1	275
112	1	242
113	1	266
114	1	267
115	1	159
116	1	166
117	1	162
118	1	177
119	1	182
120	1	186
121	1	192
122	1	200
123	1	199
124	1	216
125	1	218
126	2	8
127	2	16
128	2	14
129	2	35
130	2	54
131	2	60
132	2	62
133	2	89
134	2	84
135	2	100
136	2	107
137	2	102
138	2	125
139	2	128
140	2	127
141	2	139
142	2	150
143	2	146
144	2	278
145	2	289
146	2	291
147	2	241
148	2	264
149	2	268
150	2	157
151	2	164
152	2	167
153	2	176
154	2	184
155	2	179
156	2	193
157	2	197
158	2	203
159	2	217
160	2	215
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shifts (id, exam_id, name, scheduled_start, is_active, is_paused, paused_at, extra_time_min, started_at, ended_at, paper_generated, created_at, access_close_at, duration_override_min) FROM stdin;
2	1	Afternoon Batch	2026-09-11 08:30:00+00	f	f	\N	0	\N	\N	t	2026-09-12 13:17:06.708705+00	\N	\N
1	1	Morning Batch	2026-09-11 03:30:00+00	t	f	\N	0	2026-09-12 21:27:53.278805+00	\N	t	2026-09-12 13:17:06.708705+00	\N	\N
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subjects (id, exam_id, name) FROM stdin;
10	1	Mathematics
11	1	English
12	1	C Programming
13	1	Aptitude
\.


--
-- Data for Name: topics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.topics (id, subject_id, name) FROM stdin;
16	10	Algebra
17	10	Geometry and Vectors
18	10	Calculus
19	10	Trigonometry
20	10	Probability
21	10	P&C
22	11	General
23	12	General
24	13	General Aptitude
25	13	Verbal Aptitude
26	13	Non Verbal Aptitude
27	13	Mixtures & Allegations
\.


--
-- Data for Name: weightage_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.weightage_rules (id, exam_id, topic_id, easy_count, medium_count, hard_count, student_easy_count, student_medium_count, student_hard_count) FROM stdin;
73	1	16	0	3	0	0	0	0
75	1	17	0	1	2	0	0	0
76	1	18	0	1	2	0	0	0
77	1	19	0	1	2	0	0	0
78	1	20	0	1	2	0	0	0
79	1	21	0	1	2	0	0	0
80	1	22	0	3	0	0	0	0
81	1	23	0	1	2	0	0	0
82	1	24	0	1	2	0	0	0
83	1	25	0	1	2	0	0	0
84	1	26	0	1	2	0	0	0
85	1	27	0	0	2	0	0	0
\.


--
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admins_id_seq', 1, true);


--
-- Name: candidate_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidate_questions_id_seq', 70, true);


--
-- Name: candidate_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidate_sessions_id_seq', 3, true);


--
-- Name: candidates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidates_id_seq', 15, true);


--
-- Name: disqualification_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.disqualification_log_id_seq', 1, false);


--
-- Name: exam_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_config_id_seq', 1, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.questions_id_seq', 300, true);


--
-- Name: results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.results_id_seq', 2, true);


--
-- Name: shift_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shift_questions_id_seq', 160, true);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shifts_id_seq', 2, true);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subjects_id_seq', 13, true);


--
-- Name: topics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.topics_id_seq', 27, true);


--
-- Name: weightage_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.weightage_rules_id_seq', 109, true);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: candidate_questions candidate_questions_candidate_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_questions
    ADD CONSTRAINT candidate_questions_candidate_id_position_key UNIQUE (candidate_id, "position");


--
-- Name: candidate_questions candidate_questions_candidate_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_questions
    ADD CONSTRAINT candidate_questions_candidate_id_question_id_key UNIQUE (candidate_id, question_id);


--
-- Name: candidate_questions candidate_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_questions
    ADD CONSTRAINT candidate_questions_pkey PRIMARY KEY (id);


--
-- Name: candidate_sessions candidate_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_sessions
    ADD CONSTRAINT candidate_sessions_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_roll_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_roll_no_key UNIQUE (roll_no);


--
-- Name: candidates candidates_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_token_key UNIQUE (token);


--
-- Name: disqualification_log disqualification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disqualification_log
    ADD CONSTRAINT disqualification_log_pkey PRIMARY KEY (id);


--
-- Name: exam_config exam_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_config
    ADD CONSTRAINT exam_config_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: results results_candidate_id_shift_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_candidate_id_shift_id_key UNIQUE (candidate_id, shift_id);


--
-- Name: results results_candidate_shift_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_candidate_shift_unique UNIQUE (candidate_id, shift_id);


--
-- Name: results results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_pkey PRIMARY KEY (id);


--
-- Name: shift_questions shift_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_questions
    ADD CONSTRAINT shift_questions_pkey PRIMARY KEY (id);


--
-- Name: shift_questions shift_questions_shift_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_questions
    ADD CONSTRAINT shift_questions_shift_id_question_id_key UNIQUE (shift_id, question_id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: weightage_rules weightage_rules_exam_id_topic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weightage_rules
    ADD CONSTRAINT weightage_rules_exam_id_topic_id_key UNIQUE (exam_id, topic_id);


--
-- Name: weightage_rules weightage_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weightage_rules
    ADD CONSTRAINT weightage_rules_pkey PRIMARY KEY (id);


--
-- Name: idx_disq_log_reported; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disq_log_reported ON public.disqualification_log USING btree (reported_at DESC);


--
-- Name: candidate_questions candidate_questions_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_questions
    ADD CONSTRAINT candidate_questions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id);


--
-- Name: candidate_questions candidate_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_questions
    ADD CONSTRAINT candidate_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: candidate_sessions candidate_sessions_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_sessions
    ADD CONSTRAINT candidate_sessions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id);


--
-- Name: candidate_sessions candidate_sessions_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_sessions
    ADD CONSTRAINT candidate_sessions_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: candidates candidates_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: candidates candidates_used_in_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_used_in_shift_id_fkey FOREIGN KEY (used_in_shift_id) REFERENCES public.shifts(id);


--
-- Name: disqualification_log disqualification_log_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disqualification_log
    ADD CONSTRAINT disqualification_log_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE SET NULL;


--
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exam_config(id) ON DELETE CASCADE;


--
-- Name: questions questions_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id);


--
-- Name: results results_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id);


--
-- Name: results results_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: shift_questions shift_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_questions
    ADD CONSTRAINT shift_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: shift_questions shift_questions_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_questions
    ADD CONSTRAINT shift_questions_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;


--
-- Name: shifts shifts_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exam_config(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exam_config(id) ON DELETE CASCADE;


--
-- Name: topics topics_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: weightage_rules weightage_rules_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weightage_rules
    ADD CONSTRAINT weightage_rules_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exam_config(id) ON DELETE CASCADE;


--
-- Name: weightage_rules weightage_rules_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weightage_rules
    ADD CONSTRAINT weightage_rules_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Z0Gk7AiErIvg4HSBCSAyAOPoWy4LmB99LyS2BtvUnvT9fXSI1XsyYgCLJFzIw4e

