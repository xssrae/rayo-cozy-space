ALTER TABLE "focus_sessions" DROP CONSTRAINT "focus_sessions_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "focus_sessions" DROP CONSTRAINT "focus_sessions_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_project_id_projects_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_id_workspace_unique" ON "projects" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_id_project_workspace_unique" ON "tasks" USING btree ("id","project_id","workspace_id");--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_project_workspace_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_task_project_workspace_fk" FOREIGN KEY ("task_id","project_id","workspace_id") REFERENCES "public"."tasks"("id","project_id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_workspace_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;
