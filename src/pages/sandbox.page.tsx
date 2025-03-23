import {
	Button,
	Center,
	Container,
	HStack,
	Input,
	Stack,
} from "@chakra-ui/react";
import { EnvConfig } from "../env.config";
import { useEffect, useState } from "react";

export const SandboxPage = () => {
	return (
		<Container maxW="container.xl" py={8} width="100%" height="100%">
			<Center h="100%">
				<Stack>
					<Counter />
				</Stack>
			</Center>
		</Container>
	);
};

const Counter = () => {
	const [name, setName] = useState("abc");
	const [count, setCount] = useState(null as number | null);

	const getAndSetCurrent = (doName: string) =>
		fetch(`http://${EnvConfig.Host}/api/counter/current?name=${doName}`)
			.then((res) => res.json())
			.then((json) => setCount((json as { current: number }).current));

	useEffect(() => {
		getAndSetCurrent(name);
	}, []);

	return (
		<Stack gap="4" p="8" boxShadow="md">
			<span>Durable Object name:</span>
			<Input
				name="do-name"
				value={name}
				onChange={(e) => {
					setName(e.target.value);
					getAndSetCurrent(e.target.value);
				}}
			/>
			<HStack>
				<span>Counter value:</span>
				<span>{count ?? "Unknown"}</span>
			</HStack>
			<HStack>
				<Button
					colorPalette="green"
					onClick={() =>
						fetch(`http://${EnvConfig.Host}/api/counter/increment?name=${name}`)
							.then((res) => res.json())
							.then((json) => setCount((json as { current: number }).current))
					}
				>
					Increment
				</Button>
				<Button
					colorPalette="red"
					onClick={() =>
						fetch(`http://${EnvConfig.Host}/api/counter/decrement?name=${name}`)
							.then((res) => res.json())
							.then((json) => setCount((json as { current: number }).current))
					}
				>
					Decrement
				</Button>
			</HStack>
		</Stack>
	);
};
