import {
	Button,
	Flex,
	HStack,
	IconButton,
	Input,
	Stack,
} from "@chakra-ui/react";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { renderToStaticMarkup } from "react-dom/server";
import { LuTrash } from "react-icons/lu";
import { Provider } from "../src/components/ui/provider";
import { SandboxLayout } from "../src/pages/sandbox.page";
import type { EnvBindings } from "./env.type";

interface TodoListItem {
	id: string;
	text: string;
}

interface SiteData {
	title: string;
	children?: any;
}

const Layout = (props: SiteData) => (
	<html>
		<head>
			<title>{props.title}</title>
			<link rel="stylesheet" href="/style.css" />
		</head>
		<body>{props.children}</body>
	</html>
);

const HonoApp = (props: TodoListFormProps) => (
	<Layout
		title={`(${props.todoList.length}) Todo List in ${props.durableObjectName}`}
	>
		<Provider>
			<SandboxLayout>
				<Stack alignItems="center">
					<Stack alignItems="start">
						{props.todoList.map((todo) => (
							<Flex
								key={todo.id}
								w="100%"
								minWidth="250px"
								gap="4"
								alignItems="center"
								justifyContent="space-between"
							>
								<a
									href={`/api/todos?name=${props.durableObjectName}&todoId=${todo.id}&content=${todo.text}`}
								>
									<span>{todo.text}</span>
								</a>
								<form
									method="post"
									action={`/api/todos/${todo.id}/delete?name=${props.durableObjectName}`}
								>
									<IconButton type="submit" colorPalette="red" variant="ghost">
										<LuTrash />
									</IconButton>
								</form>
							</Flex>
						))}
					</Stack>
					<TodoListForm
						durableObjectName={props.durableObjectName}
						todoList={props.todoList}
						//
						editingTodoId={props.editingTodoId}
						editingTodoContent={props.editingTodoContent}
					/>
				</Stack>
			</SandboxLayout>
		</Provider>
	</Layout>
);

interface TodoListFormProps {
	durableObjectName: string;
	todoList: TodoListItem[];
	//
	editingTodoId?: string;
	editingTodoContent?: string;
}

const TodoListForm = (props: TodoListFormProps) => {
	return (
		<form
			method="post"
			action={
				props.editingTodoId
					? `/api/todos/${props.editingTodoId}/edit?name=${props.durableObjectName}`
					: `/api/todos/add?name=${props.durableObjectName}`
			}
		>
			<Stack gap="4" p="8">
				<Input name="content" defaultValue={props.editingTodoContent} />
				<Button type="submit" colorPalette="green">
					{props.editingTodoId ? "Update" : "Add"}
				</Button>
			</Stack>
		</form>
	);
};

export class TodoList {
	static basePath = "/api/todos";

	state: DurableObjectState;
	app = new Hono().basePath(TodoList.basePath);
	list: TodoListItem[] = [];
	initialPromise: Promise<void>;

	constructor(state: DurableObjectState, _env: EnvBindings) {
		this.state = state;
		this.initialPromise = this.state.blockConcurrencyWhile(async () => {
			const stored = await this.state.storage.get<TodoListItem[]>("list");
			this.list = stored ?? [];
		});

		const todoListUrl = ({ name, error }: { name: string; error?: string }) =>
			`${TodoList.basePath}?name=${name}${error ? `&error=${error}` : ""}`;

		this.app.post("/add", async (c) => {
			const name = c.req.query("name")!;

			const todo = await c.req.formData();
			const content = todo.get("content");

			if (!content) {
				return c.redirect(todoListUrl({ name, error: `missing content` }));
			}

			if (typeof content !== "string") {
				return c.redirect(todoListUrl({ name, error: `invalid content` }));
			}

			this.list.push({ id: nanoid(), text: content });

			await this.state.storage.put("list", this.list);

			return c.redirect(todoListUrl({ name }));
		});

		this.app.post("/:todoId/edit", async (c) => {
			const name = c.req.query("name")!;

			const todo = await c.req.formData();
			const content = todo.get("content");

			if (!content) {
				return c.redirect(todoListUrl({ name, error: `missing content` }));
			}
			if (typeof content !== "string") {
				return c.redirect(todoListUrl({ name, error: `invalid content` }));
			}

			const todoId = c.req.param("todoId");
			const index = this.list.findIndex((todo) => todo.id === todoId);
			if (index === -1)
				return c.redirect(todoListUrl({ name, error: `not found` }));

			this.list[index]!.text = content;
			await this.state.storage.put("list", this.list);

			return c.redirect(todoListUrl({ name }));
		});

		this.app.post("/:todoId/delete", async (c) => {
			const name = c.req.query("name")!;

			const todoId = c.req.param("todoId");
			const index = this.list.findIndex((todo) => todo.id === todoId);
			if (index === -1)
				return c.redirect(todoListUrl({ name, error: `not found` }));

			this.list.splice(index, 1);
			await this.state.storage.put("list", this.list);

			return c.redirect(todoListUrl({ name }));
		});

		this.app.get("/", async (c) => {
			const { name, todoId, content } = c.req.query();

			return c.html(
				renderToStaticMarkup(
					<HonoApp
						todoList={this.list}
						durableObjectName={name!}
						editingTodoId={todoId}
						editingTodoContent={content}
					/>,
				),
			);
		});
	}

	async fetch(request: Request) {
		// ensures the in memory state is always up to date
		await this.initialPromise;
		return this.app.fetch(request);
	}
}
