ALTER TABLE public.projects ADD CONSTRAINT projects_name_length CHECK (length(name) <= 255);
ALTER TABLE public.projects ADD CONSTRAINT projects_description_length CHECK (length(description) <= 5000);

ALTER TABLE public.project_notes ADD CONSTRAINT notes_title_length CHECK (length(title) <= 500);
ALTER TABLE public.project_notes ADD CONSTRAINT notes_content_length CHECK (length(content) <= 100000);

ALTER TABLE public.raci_matrix ADD CONSTRAINT raci_activity_length CHECK (length(activity) <= 1000);
ALTER TABLE public.raci_matrix ADD CONSTRAINT raci_responsible_length CHECK (length(responsible) <= 1000);
ALTER TABLE public.raci_matrix ADD CONSTRAINT raci_accountable_length CHECK (length(accountable) <= 1000);
ALTER TABLE public.raci_matrix ADD CONSTRAINT raci_consulted_length CHECK (length(consulted) <= 1000);
ALTER TABLE public.raci_matrix ADD CONSTRAINT raci_informed_length CHECK (length(informed) <= 1000);

ALTER TABLE public.control_plans ADD CONSTRAINT cp_process_step_length CHECK (length(process_step) <= 1000);
ALTER TABLE public.control_plans ADD CONSTRAINT cp_characteristic_length CHECK (length(characteristic) <= 1000);
ALTER TABLE public.control_plans ADD CONSTRAINT cp_specification_length CHECK (length(specification) <= 1000);
ALTER TABLE public.control_plans ADD CONSTRAINT cp_measurement_method_length CHECK (length(measurement_method) <= 1000);
ALTER TABLE public.control_plans ADD CONSTRAINT cp_sample_size_length CHECK (length(sample_size) <= 255);
ALTER TABLE public.control_plans ADD CONSTRAINT cp_frequency_length CHECK (length(frequency) <= 255);
ALTER TABLE public.control_plans ADD CONSTRAINT cp_responsible_length CHECK (length(responsible) <= 255);
ALTER TABLE public.control_plans ADD CONSTRAINT cp_reaction_plan_length CHECK (length(reaction_plan) <= 1000);

ALTER TABLE public.project_control_charts ADD CONSTRAINT pcc_chart_name_length CHECK (length(chart_name) <= 255);
ALTER TABLE public.project_control_charts ADD CONSTRAINT pcc_chart_type_length CHECK (length(chart_type) <= 255);
ALTER TABLE public.project_control_charts ADD CONSTRAINT pcc_notes_length CHECK (length(notes) <= 5000);

ALTER TABLE public.project_calculations ADD CONSTRAINT pcalc_tool_id_length CHECK (length(tool_id) <= 255);
ALTER TABLE public.project_calculations ADD CONSTRAINT pcalc_tool_name_length CHECK (length(tool_name) <= 255);
ALTER TABLE public.project_calculations ADD CONSTRAINT pcalc_notes_length CHECK (length(notes) <= 10000);

ALTER TABLE public.tollgate_items ADD CONSTRAINT ti_title_length CHECK (length(title) <= 500);
ALTER TABLE public.tollgate_items ADD CONSTRAINT ti_description_length CHECK (length(description) <= 5000);

ALTER TABLE public.sigma_tracking ADD CONSTRAINT st_notes_length CHECK (length(notes) <= 5000);