SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict vz8Yeh4M9bI8D9FpMp1n1LJrw9hekdQf6s8dchYADRVCcUR4bEfWrIob1xTlOfP

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."categories" ("id", "name", "created_at", "updated_at") VALUES
	('4b4bad40-0083-4ca3-a884-e4e10cdd20e2', 'Bebidas', '2026-03-15 07:11:01.729798+00', '2026-03-15 07:11:01.729798+00'),
	('76ccf660-3848-4e18-b6f4-878a46bb4e20', 'Petiscos', '2026-03-15 07:11:01.729798+00', '2026-03-15 07:11:01.729798+00'),
	('9a06d5c3-c3f2-416b-8076-0baabd01e0ab', 'Pratos Principais', '2026-03-15 07:11:01.729798+00', '2026-03-15 07:11:01.729798+00'),
	('1f0f92b2-6b74-4436-91d3-0f2fc66123a0', 'Sobremesas', '2026-03-15 07:11:01.729798+00', '2026-03-15 07:11:01.729798+00'),
	('31932e0b-a061-4df4-a008-e25c957a5b21', 'Bebidas', '2026-03-15 07:11:01.774853+00', '2026-03-15 07:11:01.774853+00'),
	('a8ebb8e0-53e5-4c5d-b89e-5c60af6b62a4', 'Petiscos', '2026-03-15 07:11:01.774853+00', '2026-03-15 07:11:01.774853+00'),
	('6b8808eb-58bb-4ad2-9060-b8e866f49a83', 'Pratos Principais', '2026-03-15 07:11:01.774853+00', '2026-03-15 07:11:01.774853+00'),
	('ff393ecb-09f7-4961-81c4-3510475cfe0a', 'Sobremesas', '2026-03-15 07:11:01.774853+00', '2026-03-15 07:11:01.774853+00');


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."products" ("id", "name", "price", "image_url", "is_active", "category_id", "created_at", "updated_at", "description") VALUES
	('15b13512-1de6-4354-9121-324907404f7f', 'Cuca 1L', 3500.00, NULL, true, '4b4bad40-0083-4ca3-a884-e4e10cdd20e2', '2026-03-15 07:11:01.729798+00', '2026-03-15 07:11:01.729798+00', NULL),
	('674a8106-72ea-4f7b-ae08-c67031cfcb32', 'Fanta Laranja 2L', 2800.00, NULL, true, '4b4bad40-0083-4ca3-a884-e4e10cdd20e2', '2026-03-15 07:11:01.729798+00', '2026-03-15 07:11:01.729798+00', NULL),
	('c6a8c6ec-5a59-4fdf-9dcd-a5d1bf0d5085', 'Mufete', 12000.00, NULL, true, '9a06d5c3-c3f2-416b-8076-0baabd01e0ab', '2026-03-15 07:11:01.729798+00', '2026-03-15 07:11:01.729798+00', NULL),
	('91ddf356-f8e5-40f6-99be-15a9e3269b09', 'Muamba de Galinha', 8500.00, NULL, true, '9a06d5c3-c3f2-416b-8076-0baabd01e0ab', '2026-03-15 07:11:01.729798+00', '2026-03-15 07:11:01.729798+00', NULL),
	('668241f6-beed-4c75-ac65-a80fbb9e0130', 'Coxinha de Frango', 2500.00, NULL, true, '76ccf660-3848-4e18-b6f4-878a46bb4e20', '2026-03-15 07:11:01.729798+00', '2026-03-15 07:11:01.729798+00', NULL),
	('2e513bb1-71fb-4956-8049-abdd55f6a2dc', 'Cuca 1L', 3500.00, NULL, true, '4b4bad40-0083-4ca3-a884-e4e10cdd20e2', '2026-03-15 07:11:01.774853+00', '2026-03-15 07:11:01.774853+00', NULL),
	('8d8eb4f5-3c3e-40d0-9b9e-29b84bd9c022', 'Fanta Laranja 2L', 2800.00, NULL, true, '4b4bad40-0083-4ca3-a884-e4e10cdd20e2', '2026-03-15 07:11:01.774853+00', '2026-03-15 07:11:01.774853+00', NULL),
	('37e01cd7-656b-419a-822d-e53e7e44c49c', 'Mufete', 12000.00, NULL, true, '9a06d5c3-c3f2-416b-8076-0baabd01e0ab', '2026-03-15 07:11:01.774853+00', '2026-03-15 07:11:01.774853+00', NULL),
	('b465d457-dd1c-42b1-aae9-51007414adc7', 'Muamba de Galinha', 8500.00, NULL, true, '9a06d5c3-c3f2-416b-8076-0baabd01e0ab', '2026-03-15 07:11:01.774853+00', '2026-03-15 07:11:01.774853+00', NULL),
	('8ff0f24f-833d-4c78-aa0a-a0fea8b932d5', 'Coxinha de Frango', 2500.00, NULL, true, '76ccf660-3848-4e18-b6f4-878a46bb4e20', '2026-03-15 07:11:01.774853+00', '2026-03-15 07:11:01.774853+00', NULL);


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- PostgreSQL database dump complete
--

-- \unrestrict vz8Yeh4M9bI8D9FpMp1n1LJrw9hekdQf6s8dchYADRVCcUR4bEfWrIob1xTlOfP

RESET ALL;
