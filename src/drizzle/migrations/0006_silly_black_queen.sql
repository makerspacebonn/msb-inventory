CREATE TABLE "projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"leaderId" varchar(255) NOT NULL,
	"guildId" varchar(255) NOT NULL,
	"people" varchar(255)[],
	"link" varchar(255)[],
	"deadlineAt" timestamp,
	"doneAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);
