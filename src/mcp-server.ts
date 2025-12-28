/**
 * MCP Server Factory for Single-User Hevy API Integration
 *
 * This module creates an MCP server instance with all 17 Hevy API tools.
 * Uses the MCP SDK directly instead of the agents library for Docker deployment.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { HevyClient } from "./lib/client.js";
import { handleError } from "./lib/errors.js";
import {
	transformExerciseTemplateToAPI,
	transformRoutineFolderToAPI,
	transformRoutineToAPI,
	transformWorkoutToAPI,
} from "./lib/schemas.js";
import {
	PAGINATION_LIMITS,
	ValidationError,
	validateExerciseTemplate,
	validateISO8601Date,
	validatePagination,
	validateRoutineData,
	validateWorkoutData,
} from "./lib/transforms.js";

/**
 * Create MCP server instance with Hevy API tools
 * @param apiKey - Hevy API key from environment variable
 * @returns Configured MCP server
 */
export function createMcpServer(apiKey: string): Server {
	const server = new Server(
		{
			name: "Hevy API",
			version: "4.0.0",
			description: "Single-user MCP server for Hevy fitness tracking API",
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	const client = new HevyClient({ apiKey });

	// Register list tools handler - defines all 17 available tools
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [
				// WORKOUTS (6 tools)
				{
					name: "get_workouts",
					description: "Get a paginated list of workouts with details",
					inputSchema: {
						type: "object",
						properties: {
							page: {
								type: "number",
								description: "Page number (Must be 1 or greater)",
								default: 1,
							},
							page_size: {
								type: "number",
								description: "Number of items per page (Max 10)",
								default: 10,
							},
						},
					},
				},
				{
					name: "get_workout",
					description: "Get a single workout by ID with full details",
					inputSchema: {
						type: "object",
						properties: {
							workout_id: {
								type: "string",
								description: "The ID of the workout to retrieve",
							},
						},
						required: ["workout_id"],
					},
				},
				{
					name: "create_workout",
					description: "Log a new workout with exercises and sets",
					inputSchema: {
						type: "object",
						properties: {
							title: { type: "string", description: "Workout title" },
							start_time: {
								type: "string",
								description: "Start time (ISO 8601)",
							},
							end_time: { type: "string", description: "End time (ISO 8601)" },
							exercises: {
								type: "array",
								description: "Array of exercises with sets",
								items: { type: "object" },
							},
							description: {
								type: "string",
								description: "Workout description (optional)",
							},
							is_private: {
								type: "boolean",
								description: "Privacy setting (optional)",
							},
						},
						required: ["title", "start_time", "end_time", "exercises"],
					},
				},
				{
					name: "update_workout",
					description: "Update an existing workout",
					inputSchema: {
						type: "object",
						properties: {
							workout_id: {
								type: "string",
								description: "The ID of the workout to update",
							},
							title: { type: "string", description: "Workout title" },
							start_time: {
								type: "string",
								description: "Start time (ISO 8601)",
							},
							end_time: { type: "string", description: "End time (ISO 8601)" },
							exercises: { type: "array", items: { type: "object" } },
							description: { type: "string" },
							is_private: { type: "boolean" },
						},
						required: ["workout_id", "title", "start_time", "end_time", "exercises"],
					},
				},
				{
					name: "get_workouts_count",
					description: "Get the total number of workouts in your account",
					inputSchema: {
						type: "object",
						properties: {},
					},
				},
				{
					name: "get_workout_events",
					description:
						"Get workout change events (updates/deletes) since a date for syncing",
					inputSchema: {
						type: "object",
						properties: {
							page: { type: "number", default: 1 },
							page_size: { type: "number", default: 5 },
							since: {
								type: "string",
								description:
									"Get events since this date (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)",
							},
						},
					},
				},

				// ROUTINES (4 tools)
				{
					name: "get_routines",
					description: "Get a paginated list of workout routines",
					inputSchema: {
						type: "object",
						properties: {
							page: { type: "number", default: 1 },
							page_size: { type: "number", default: 5 },
						},
					},
				},
				{
					name: "get_routine",
					description: "Get a single routine by ID with full exercise details",
					inputSchema: {
						type: "object",
						properties: {
							routine_id: {
								type: "string",
								description: "The ID of the routine to retrieve",
							},
						},
						required: ["routine_id"],
					},
				},
				{
					name: "create_routine",
					description: "Create a new workout routine/program",
					inputSchema: {
						type: "object",
						properties: {
							title: { type: "string", description: "Routine title" },
							exercises: { type: "array", items: { type: "object" } },
							folder_id: {
								type: "string",
								description: "Folder ID (optional)",
							},
							notes: { type: "string", description: "Notes (optional)" },
						},
						required: ["title", "exercises"],
					},
				},
				{
					name: "update_routine",
					description: "Update an existing routine",
					inputSchema: {
						type: "object",
						properties: {
							routine_id: {
								type: "string",
								description: "The ID of the routine to update",
							},
							title: { type: "string" },
							exercises: { type: "array", items: { type: "object" } },
							folder_id: { type: "string" },
							notes: { type: "string" },
						},
						required: ["routine_id", "title", "exercises"],
					},
				},

				// EXERCISE TEMPLATES (4 tools)
				{
					name: "get_exercise_templates",
					description: "Get available exercise templates (both built-in and custom)",
					inputSchema: {
						type: "object",
						properties: {
							page: { type: "number", default: 1 },
							page_size: { type: "number", default: 20 },
						},
					},
				},
				{
					name: "get_exercise_template",
					description: "Get detailed information about a specific exercise template",
					inputSchema: {
						type: "object",
						properties: {
							exercise_template_id: {
								type: "string",
								description: "The ID of the exercise template",
							},
						},
						required: ["exercise_template_id"],
					},
				},
				{
					name: "create_exercise_template",
					description: "Create a custom exercise template",
					inputSchema: {
						type: "object",
						properties: {
							title: { type: "string", description: "Exercise name" },
							equipment_category: {
								type: "string",
								description: "Equipment category",
							},
							primary_muscle_group: {
								type: "string",
								description: "Primary muscle group",
							},
							secondary_muscle_groups: {
								type: "array",
								items: { type: "string" },
								description: "Secondary muscle groups (optional)",
							},
							is_unilateral: {
								type: "boolean",
								description: "Whether exercise is unilateral (optional)",
							},
						},
						required: ["title", "equipment_category", "primary_muscle_group"],
					},
				},
				{
					name: "get_exercise_history",
					description: "Get exercise history for tracking progress over time",
					inputSchema: {
						type: "object",
						properties: {
							exercise_template_id: {
								type: "string",
								description: "The ID of the exercise template",
							},
							start_date: {
								type: "string",
								description: "Optional start date (ISO 8601)",
							},
							end_date: {
								type: "string",
								description: "Optional end date (ISO 8601)",
							},
						},
						required: ["exercise_template_id"],
					},
				},

				// ROUTINE FOLDERS (3 tools)
				{
					name: "get_routine_folders",
					description: "Get routine organization folders",
					inputSchema: {
						type: "object",
						properties: {
							page: { type: "number", default: 1 },
							page_size: { type: "number", default: 10 },
						},
					},
				},
				{
					name: "get_routine_folder",
					description: "Get details of a specific routine folder",
					inputSchema: {
						type: "object",
						properties: {
							routine_folder_id: {
								type: "string",
								description: "The ID of the routine folder",
							},
						},
						required: ["routine_folder_id"],
					},
				},
				{
					name: "create_routine_folder",
					description: "Create a new routine folder",
					inputSchema: {
						type: "object",
						properties: {
							title: { type: "string", description: "Folder title" },
						},
						required: ["title"],
					},
				},
			],
		};
	});

	// Register tool call handler - executes the requested tool
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: rawArgs } = request.params;

		// Type assertion: treat args as any for easier handling
		// Individual validation functions will check types as needed
		const args = rawArgs as any;

		try {
			switch (name) {
				// ============================================
				// WORKOUTS
				// ============================================

				case "get_workouts": {
					const page = args.page || 1;
					const page_size = args.page_size || 10;
					validatePagination(page, page_size, PAGINATION_LIMITS.WORKOUTS);

					const workouts = await client.getWorkouts({
						page,
						pageSize: page_size,
					});

					const workoutDetails =
						workouts.workouts
							?.map((workout: any, index: number) => {
								return `Workout ${index + 1}: ${workout.title || "Untitled"}\n  ID: ${workout.id}\n  Date: ${workout.start_time}`;
							})
							.join("\n") || "No workouts found";

					return {
						content: [
							{
								type: "text",
								text: `Retrieved ${workouts.workouts?.length || 0} workouts (page ${workouts.page} of ${workouts.page_count})`,
							},
							{
								type: "text",
								text: workoutDetails,
							},
							{
								type: "text",
								text: `\n\nFull data:\n${JSON.stringify(workouts.workouts, null, 2)}`,
							},
						],
					};
				}

				case "get_workout": {
					const workout = await client.getWorkout(args.workout_id);

					return {
						content: [
							{
								type: "text",
								text: `Workout: ${workout.title || "Untitled"}\nID: ${workout.id}\nExercises: ${workout.exercises?.length || 0}`,
							},
							{
								type: "text",
								text: JSON.stringify(workout, null, 2),
							},
						],
					};
				}

				case "create_workout": {
					validateWorkoutData(args);
					const workout = await client.createWorkout(transformWorkoutToAPI(args));

					return {
						content: [
							{
								type: "text",
								text: `✓ Successfully logged workout: ${workout.title}`,
							},
							{
								type: "text",
								text: `Workout ID: ${workout.id}\nExercises: ${workout.exercises?.length || 0}\nStarted: ${args.start_time}`,
							},
							{
								type: "text",
								text: `\n\nWorkout data:\n${JSON.stringify(workout, null, 2)}`,
							},
						],
					};
				}

				case "update_workout": {
					const { workout_id, ...workoutData } = args;
					validateWorkoutData(workoutData);
					const workout = await client.updateWorkout(
						workout_id,
						transformWorkoutToAPI(workoutData),
					);

					return {
						content: [
							{
								type: "text",
								text: `✓ Successfully updated workout: ${workout.title}`,
							},
							{
								type: "text",
								text: `Workout ID: ${workout.id}\nExercises: ${workout.exercises?.length || 0}`,
							},
						],
					};
				}

				case "get_workouts_count": {
					const result = await client.getWorkoutsCount();

					return {
						content: [
							{
								type: "text",
								text: `Total workouts: ${result.workout_count}`,
							},
						],
					};
				}

				case "get_workout_events": {
					const page = args.page || 1;
					const page_size = args.page_size || 5;
					validatePagination(page, page_size, PAGINATION_LIMITS.WORKOUT_EVENTS);

					if (args.since) {
						validateISO8601Date(args.since, "since");
					}

					const params: any = { page, pageSize: page_size };
					if (args.since) params.since = args.since;

					const events = await client.getWorkoutEvents(params);

					const eventDetails =
						events.events
							?.map((event: any, index: number) => {
								if (event.type === "deleted") {
									return `${index + 1}. DELETED - Workout ID: ${event.id}\n   Deleted at: ${event.deleted_at}`;
								}
								return `${index + 1}. UPDATED - ${event.workout?.title || "Untitled"}\n   Workout ID: ${event.workout?.id}\n   Updated: ${event.workout?.updated_at}`;
							})
							.join("\n") || "No events found";

					return {
						content: [
							{
								type: "text",
								text: `Retrieved ${events.events?.length || 0} workout events (page ${events.page} of ${events.page_count})`,
							},
							{
								type: "text",
								text: eventDetails,
							},
						],
					};
				}

				// ============================================
				// ROUTINES
				// ============================================

				case "get_routines": {
					const page = args.page || 1;
					const page_size = args.page_size || 5;
					validatePagination(page, page_size, PAGINATION_LIMITS.ROUTINES);

					const routines = await client.getRoutines({
						page,
						pageSize: page_size,
					});

					const routineDetails =
						routines.routines
							?.map((routine: any, index: number) => {
								const exerciseCount = routine.exercises?.length || 0;
								return `Routine ${index + 1}: ${routine.title}\n  Exercises: ${exerciseCount}\n  ID: ${routine.id}`;
							})
							.join("\n") || "No routines found";

					return {
						content: [
							{
								type: "text",
								text: `Retrieved ${routines.routines?.length || 0} routines (page ${routines.page} of ${routines.page_count})`,
							},
							{
								type: "text",
								text: routineDetails,
							},
							{
								type: "text",
								text: `\n\nFull data:\n${JSON.stringify(routines.routines, null, 2)}`,
							},
						],
					};
				}

				case "get_routine": {
					const result = await client.getRoutine(args.routine_id);
					const routine = result.routine;

					return {
						content: [
							{
								type: "text",
								text: `Routine: ${routine.title}\nID: ${routine.id}\nExercises: ${routine.exercises?.length || 0}`,
							},
							{
								type: "text",
								text: JSON.stringify(routine, null, 2),
							},
						],
					};
				}

				case "create_routine": {
					validateRoutineData(args);
					const routine = await client.createRoutine(transformRoutineToAPI(args));

					return {
						content: [
							{
								type: "text",
								text: `✓ Successfully created routine: ${routine.title}`,
							},
							{
								type: "text",
								text: `Routine ID: ${routine.id}\nExercises: ${routine.exercises?.length || 0}`,
							},
							{
								type: "text",
								text: `\n\nFull routine data:\n${JSON.stringify(routine, null, 2)}`,
							},
						],
					};
				}

				case "update_routine": {
					const { routine_id, ...routineData } = args;
					validateRoutineData(routineData);
					const routine = await client.updateRoutine(
						routine_id,
						transformRoutineToAPI(routineData),
					);

					return {
						content: [
							{
								type: "text",
								text: `✓ Successfully updated routine: ${routine.title}`,
							},
							{
								type: "text",
								text: `Routine ID: ${routine.id}\nExercises: ${routine.exercises?.length || 0}`,
							},
						],
					};
				}

				// ============================================
				// EXERCISE TEMPLATES
				// ============================================

				case "get_exercise_templates": {
					const page = args.page || 1;
					const page_size = args.page_size || 20;
					validatePagination(page, page_size, PAGINATION_LIMITS.EXERCISE_TEMPLATES);

					const templates = await client.getExerciseTemplates({
						page,
						pageSize: page_size,
					});

					const templateDetails =
						templates.exercise_templates
							?.map((template: any, index: number) => {
								return `${index + 1}. ${template.title} (${template.type})\n   ID: ${template.id}\n   Primary: ${template.primary_muscle_group}\n   Custom: ${template.is_custom ? "Yes" : "No"}`;
							})
							.join("\n") || "No exercise templates found";

					return {
						content: [
							{
								type: "text",
								text: `Retrieved ${templates.exercise_templates?.length || 0} exercise templates (page ${templates.page} of ${templates.page_count})`,
							},
							{
								type: "text",
								text: templateDetails,
							},
						],
					};
				}

				case "get_exercise_template": {
					const template = await client.getExerciseTemplate(args.exercise_template_id);

					return {
						content: [
							{
								type: "text",
								text: `Exercise: ${template.title}\nType: ${template.type}\nPrimary Muscle: ${template.primary_muscle_group}\nCustom: ${template.is_custom ? "Yes" : "No"}`,
							},
							{
								type: "text",
								text: JSON.stringify(template, null, 2),
							},
						],
					};
				}

				case "create_exercise_template": {
					validateExerciseTemplate(args);
					const result = await client.createExerciseTemplate(
						transformExerciseTemplateToAPI(args),
					);

					return {
						content: [
							{
								type: "text",
								text: `✓ Successfully created custom exercise template: ${args.title}`,
							},
							{
								type: "text",
								text: `Exercise Template ID: ${result.id}`,
							},
						],
					};
				}

				case "get_exercise_history": {
					if (args.start_date) {
						validateISO8601Date(args.start_date, "start_date");
					}
					if (args.end_date) {
						validateISO8601Date(args.end_date, "end_date");
					}

					if (args.start_date && args.end_date) {
						const start = new Date(args.start_date);
						const end = new Date(args.end_date);
						if (end <= start) {
							throw new ValidationError("end_date must be after start_date");
						}
					}

					const params: any = {};
					if (args.start_date) params.start_date = args.start_date;
					if (args.end_date) params.end_date = args.end_date;

					const history = await client.getExerciseHistory(
						args.exercise_template_id,
						params,
					);

					const historyDetails =
						history.exercise_history
							?.map((entry: any, index: number) => {
								return `${index + 1}. ${entry.workout_title} (${entry.workout_start_time})\n   Weight: ${entry.weight_kg}kg, Reps: ${entry.reps}, RPE: ${entry.rpe || "N/A"}\n   Set Type: ${entry.set_type}`;
							})
							.join("\n") || "No exercise history found";

					return {
						content: [
							{
								type: "text",
								text: `Retrieved ${history.exercise_history?.length || 0} exercise history entries`,
							},
							{
								type: "text",
								text: historyDetails,
							},
							{
								type: "text",
								text: `\n\nFull data:\n${JSON.stringify(history.exercise_history, null, 2)}`,
							},
						],
					};
				}

				// ============================================
				// ROUTINE FOLDERS
				// ============================================

				case "get_routine_folders": {
					const page = args.page || 1;
					const page_size = args.page_size || 10;
					validatePagination(page, page_size, PAGINATION_LIMITS.ROUTINE_FOLDERS);

					const folders = await client.getRoutineFolders({
						page,
						pageSize: page_size,
					});

					const folderDetails =
						folders.routine_folders
							?.map((folder: any, index: number) => {
								return `${index + 1}. ${folder.title}\n   ID: ${folder.id}\n   Index: ${folder.index}`;
							})
							.join("\n") || "No routine folders found";

					return {
						content: [
							{
								type: "text",
								text: `Retrieved ${folders.routine_folders?.length || 0} routine folders (page ${folders.page} of ${folders.page_count})`,
							},
							{
								type: "text",
								text: folderDetails,
							},
						],
					};
				}

				case "get_routine_folder": {
					const folder = await client.getRoutineFolder(
						args.routine_folder_id || args.folder_id,
					);

					return {
						content: [
							{
								type: "text",
								text: `Folder: ${folder.title}\nID: ${folder.id}\nIndex: ${folder.index}`,
							},
							{
								type: "text",
								text: JSON.stringify(folder, null, 2),
							},
						],
					};
				}

				case "create_routine_folder": {
					const folder = await client.createRoutineFolder(
						transformRoutineFolderToAPI(args),
					);

					return {
						content: [
							{
								type: "text",
								text: `✓ Successfully created routine folder: ${folder.title}`,
							},
							{
								type: "text",
								text: `Folder ID: ${folder.id}\nIndex: ${folder.index}`,
							},
						],
					};
				}

				default:
					throw new Error(`Unknown tool: ${name}`);
			}
		} catch (error) {
			return handleError(error);
		}
	});

	return server;
}
