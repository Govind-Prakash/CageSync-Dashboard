


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE TYPE "public"."animal_status" AS ENUM (
    'alive',
    'deceased',
    'sacrificed',
    'transferred'
);


ALTER TYPE "public"."animal_status" OWNER TO "postgres";


CREATE TYPE "public"."cage_status" AS ENUM (
    'active',
    'empty',
    'quarantine',
    'retired'
);


ALTER TYPE "public"."cage_status" OWNER TO "postgres";


CREATE TYPE "public"."sex" AS ENUM (
    'male',
    'female',
    'unknown'
);


ALTER TYPE "public"."sex" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'pi',
    'researcher',
    'technician',
    'observer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."animals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lab_id" "uuid",
    "cage_id" "uuid",
    "animal_code" "text" NOT NULL,
    "species" "text" DEFAULT 'Mus musculus'::"text",
    "strain" "text",
    "sex" "public"."sex" DEFAULT 'unknown'::"public"."sex",
    "dob" "date",
    "genotype" "text",
    "status" "public"."animal_status" DEFAULT 'alive'::"public"."animal_status",
    "ear_tag" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."animals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."breeding_pairs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lab_id" "uuid",
    "cage_id" "uuid",
    "male_id" "uuid",
    "female_id" "uuid",
    "paired_on" "date",
    "litter_born_on" "date",
    "litter_size" integer,
    "wean_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."breeding_pairs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lab_id" "uuid",
    "room_id" "uuid",
    "cage_code" "text" NOT NULL,
    "label" "text",
    "status" "public"."cage_status" DEFAULT 'active'::"public"."cage_status",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."experiment_animals" (
    "experiment_id" "uuid" NOT NULL,
    "animal_id" "uuid" NOT NULL,
    "group_label" "text",
    "enrolled_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."experiment_animals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."experiments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lab_id" "uuid",
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "protocol" "text",
    "start_date" "date",
    "end_date" "date",
    "iacuc_number" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."experiments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lab_id" "uuid",
    "invited_by" "uuid",
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'researcher'::"public"."user_role",
    "token" "text" DEFAULT ("gen_random_uuid"())::"text",
    "accepted" boolean DEFAULT false,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lab_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."labs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "institution" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."labs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."observations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "animal_id" "uuid",
    "cage_id" "uuid",
    "lab_id" "uuid",
    "recorded_by" "uuid",
    "weight_grams" numeric(5,2),
    "body_score" integer,
    "observation_text" "text",
    "humane_endpoint_flag" boolean DEFAULT false,
    "observed_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "observations_body_score_check" CHECK ((("body_score" >= 1) AND ("body_score" <= 5)))
);


ALTER TABLE "public"."observations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lab_id" "uuid",
    "role" "public"."user_role" DEFAULT 'researcher'::"public"."user_role"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lab_id" "uuid",
    "name" "text" NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."treatments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "animal_id" "uuid",
    "lab_id" "uuid",
    "recorded_by" "uuid",
    "treatment_type" "text" NOT NULL,
    "substance" "text",
    "dose" "text",
    "route" "text",
    "administered_at" timestamp with time zone NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."treatments" OWNER TO "postgres";


ALTER TABLE ONLY "public"."animals"
    ADD CONSTRAINT "animals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."breeding_pairs"
    ADD CONSTRAINT "breeding_pairs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cages"
    ADD CONSTRAINT "cages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."experiment_animals"
    ADD CONSTRAINT "experiment_animals_pkey" PRIMARY KEY ("experiment_id", "animal_id");



ALTER TABLE ONLY "public"."experiments"
    ADD CONSTRAINT "experiments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_invites"
    ADD CONSTRAINT "lab_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_invites"
    ADD CONSTRAINT "lab_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."labs"
    ADD CONSTRAINT "labs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "observations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."animals"
    ADD CONSTRAINT "animals_cage_id_fkey" FOREIGN KEY ("cage_id") REFERENCES "public"."cages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."animals"
    ADD CONSTRAINT "animals_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."breeding_pairs"
    ADD CONSTRAINT "breeding_pairs_cage_id_fkey" FOREIGN KEY ("cage_id") REFERENCES "public"."cages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."breeding_pairs"
    ADD CONSTRAINT "breeding_pairs_female_id_fkey" FOREIGN KEY ("female_id") REFERENCES "public"."animals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."breeding_pairs"
    ADD CONSTRAINT "breeding_pairs_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."breeding_pairs"
    ADD CONSTRAINT "breeding_pairs_male_id_fkey" FOREIGN KEY ("male_id") REFERENCES "public"."animals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cages"
    ADD CONSTRAINT "cages_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cages"
    ADD CONSTRAINT "cages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."experiment_animals"
    ADD CONSTRAINT "experiment_animals_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."experiment_animals"
    ADD CONSTRAINT "experiment_animals_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."experiments"
    ADD CONSTRAINT "experiments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."experiments"
    ADD CONSTRAINT "experiments_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_invites"
    ADD CONSTRAINT "lab_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_invites"
    ADD CONSTRAINT "lab_invites_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "observations_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "observations_cage_id_fkey" FOREIGN KEY ("cage_id") REFERENCES "public"."cages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "observations_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."observations"
    ADD CONSTRAINT "observations_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "public"."animals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."breeding_pairs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."experiment_animals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."experiments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."labs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."observations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."treatments" ENABLE ROW LEVEL SECURITY;


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";




