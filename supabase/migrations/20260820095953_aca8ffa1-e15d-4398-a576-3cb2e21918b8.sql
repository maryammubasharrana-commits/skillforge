
CREATE TYPE public.app_role AS ENUM ('student','mentor','admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  education TEXT DEFAULT '',
  career_goal TEXT DEFAULT '',
  experience_level TEXT NOT NULL DEFAULT 'beginner',
  bio TEXT DEFAULT '',
  cv_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('mentor','admin'));
$$;

CREATE POLICY "profiles_select_own_or_staff" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_own_or_staff" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills_read" ON public.skills FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "skills_write" ON public.skills FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  tech_stack TEXT DEFAULT '',
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_read" ON public.projects FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "projects_write" ON public.projects FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT DEFAULT '',
  year INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications TO authenticated;
GRANT ALL ON public.certifications TO service_role;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certs_read" ON public.certifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "certs_write" ON public.certifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  level TEXT NOT NULL DEFAULT 'beginner',
  kind TEXT NOT NULL DEFAULT 'course',
  url TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources_read_all" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "resources_staff_write" ON public.resources FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_read_all" ON public.assessment_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "questions_staff_write" ON public.assessment_questions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_results TO authenticated;
GRANT ALL ON public.assessment_results TO service_role;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_read" ON public.assessment_results FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "results_write" ON public.assessment_results FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  target_role TEXT NOT NULL DEFAULT '',
  current_level TEXT NOT NULL DEFAULT '',
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmaps TO authenticated;
GRANT ALL ON public.roadmaps TO service_role;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roadmaps_read" ON public.roadmaps FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "roadmaps_write" ON public.roadmaps FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'rag',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_own" ON public.chat_messages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.resources (title, category, level, kind, url, content) VALUES
('Python Crash Course for Beginners','Python','beginner','course','https://docs.python.org/3/tutorial/','Covers Python syntax, data types, control flow, functions, modules and file I/O. Best first step for anyone entering AI or backend engineering.'),
('Object-Oriented Python and Design Patterns','Python','intermediate','course','https://realpython.com/python3-object-oriented-programming/','Classes, inheritance, composition, dataclasses, SOLID principles. Needed before building production Python services.'),
('Modern Web Development with React','Web Development','intermediate','course','https://react.dev/learn','Components, hooks, state management, data fetching and routing. Foundation for building dashboards and portfolios.'),
('HTML, CSS and Responsive Layout Fundamentals','Web Development','beginner','course','https://developer.mozilla.org/en-US/docs/Learn','Semantic HTML, flexbox, grid, responsive design and accessibility basics.'),
('Git and GitHub Workflow Essentials','Git','beginner','course','https://git-scm.com/book/en/v2','Branching, merging, rebasing, pull requests and collaborative workflows used by every engineering team.'),
('Docker for Developers','DevOps','intermediate','course','https://docs.docker.com/get-started/','Images, containers, Dockerfiles, multi-stage builds and docker compose for local microservices.'),
('Kubernetes Fundamentals','DevOps','advanced','course','https://kubernetes.io/docs/concepts/','Pods, deployments, services, ingress, config maps and scaling containerised workloads.'),
('CI/CD Pipelines with GitHub Actions','DevOps','intermediate','course','https://docs.github.com/en/actions','Automated build, test and deploy pipelines, secrets management and environment promotion.'),
('Machine Learning Foundations','AI','intermediate','course','https://scikit-learn.org/stable/user_guide.html','Supervised and unsupervised learning, feature engineering, evaluation metrics and model selection.'),
('Deep Learning with PyTorch','AI','advanced','course','https://pytorch.org/tutorials/','Tensors, autograd, neural networks, training loops, transfer learning and deployment of models.'),
('LLM Applications: RAG and Agents','AI','advanced','course','https://python.langchain.com/docs/introduction/','Embeddings, vector search, retrieval augmented generation, tool calling and agent design.'),
('SQL and Relational Database Design','Database','beginner','course','https://www.postgresql.org/docs/current/tutorial.html','Tables, joins, indexes, normalisation, transactions and query optimisation with PostgreSQL.'),
('Data Modeling and Migrations','Database','intermediate','course','https://www.postgresql.org/docs/current/ddl.html','Schema design, constraints, migrations and versioning production databases safely.'),
('Project Idea: Personal Portfolio API','Web Development','beginner','project',NULL,'Build a REST API that serves your CV, projects and skills, with authentication and a React front end.'),
('Project Idea: ML Model Serving Microservice','AI','intermediate','project',NULL,'Train a scikit-learn model, wrap it in a FastAPI service, containerise it with Docker and deploy to Kubernetes.'),
('Project Idea: RAG Documentation Assistant','AI','advanced','project',NULL,'Ingest documentation, chunk and embed it, store vectors and answer grounded questions with citations.'),
('Career Roadmap: AI Engineer','AI','advanced','roadmap',NULL,'Python and OOP, data handling with pandas/numpy, classical ML, deep learning, LLM APIs, RAG, vector databases, MLOps with Docker and Kubernetes, model evaluation and monitoring.'),
('Career Roadmap: Full Stack Developer','Web Development','intermediate','roadmap',NULL,'HTML/CSS/JS, React, TypeScript, REST and API design, databases and SQL, authentication, testing, CI/CD and cloud deployment.'),
('Career Roadmap: DevOps Engineer','DevOps','advanced','roadmap',NULL,'Linux and shell scripting, Git, Docker, Kubernetes, Terraform and infrastructure as code, CI/CD pipelines, observability and cloud platforms.'),
('Career Roadmap: Data Engineer','Database','advanced','roadmap',NULL,'SQL mastery, Python, ETL pipelines, warehousing, orchestration with Airflow, streaming and cloud data platforms.'),
('Linux Shell Scripting Basics','DevOps','beginner','course','https://www.gnu.org/software/bash/manual/','Bash scripting, pipes, permissions, cron and automating deployment tasks on Linux servers.'),
('Terraform Infrastructure as Code','DevOps','advanced','course','https://developer.hashicorp.com/terraform/docs','Providers, resources, state, modules and provisioning reproducible cloud infrastructure.');

INSERT INTO public.assessment_questions (category, question, options, correct_index) VALUES
('Python','What does the len() function return for a list?','["The last element","The number of elements","The memory size","A sorted copy"]',1),
('Python','Which keyword defines a class in Python?','["func","struct","class","define"]',2),
('Python','What is a Python decorator used for?','["Styling output","Wrapping and extending a function","Defining a database","Compiling code"]',1),
('Web Development','Which HTTP method is typically used to create a resource?','["GET","POST","HEAD","OPTIONS"]',1),
('Web Development','What does CSS flexbox primarily help with?','["Database queries","One-dimensional layout","Type checking","Routing"]',1),
('Web Development','In React, what triggers a component re-render?','["A CSS change","A state or prop change","A console log","A comment"]',1),
('Git','Which command creates a new branch and switches to it?','["git branch -d","git checkout -b","git merge","git clone"]',1),
('Git','What does git rebase do?','["Deletes history","Reapplies commits on top of another base","Pushes tags","Creates a remote"]',1),
('DevOps','What is a Docker image?','["A running process","A read-only template for containers","A virtual machine","A YAML file"]',1),
('DevOps','In Kubernetes, what object manages a replicated set of pods?','["Service","Deployment","Ingress","Secret"]',1),
('DevOps','What is the purpose of Terraform state?','["Store logs","Track real infrastructure mapped to config","Cache images","Run tests"]',1),
('AI','What is overfitting?','["Model too simple","Model memorises training data and generalises poorly","Too little data","A slow GPU"]',1),
('AI','What does RAG stand for in LLM applications?','["Rapid Agent Generation","Retrieval Augmented Generation","Recursive Attention Gate","Ranked Answer Grouping"]',1),
('AI','Which is a common activation function in neural networks?','["ReLU","JOIN","SELECT","GRPC"]',0),
('Database','Which SQL clause filters rows?','["ORDER BY","WHERE","GROUP BY","LIMIT"]',1),
('Database','What is a primary key?','["A password","A unique row identifier","An index type","A foreign table"]',1),
('Database','What does an index improve?','["Write speed always","Read/query performance","Disk space","Security"]',1),
('Python','What is a list comprehension?','["A loop that prints","A concise way to build lists","A type of class","A module"]',1);
