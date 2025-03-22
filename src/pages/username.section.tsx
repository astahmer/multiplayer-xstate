import { HStack, IconButton, Input, Stack } from "@chakra-ui/react";
import { useState } from "react";
import { GiPerspectiveDiceSixFacesTwo } from "react-icons/gi";
import { generateSlug } from "random-word-slugs";

export const generateRandomName = () => {
	const slug = generateSlug(2, {
		format: "title",
		categories: {
			noun: ["animals"],
			adjective: ["personality", "taste", "size"],
		},
		partsOfSpeech: ["adjective", "noun", "adjective"],
	}).replace(/\s/g, "");

	return slug + (Math.random() > 0.6 ? 69 : "");
};

export const UsernameSection = ({
	render,
}: { render: (username: string) => JSX.Element }) => {
	const [username, setUsername] = useState(generateRandomName());
	return (
		<Stack fontWeight="bold">
			<HStack>
				<Input
					id="username"
					colorPalette="blue"
					size="2xl"
					width="300px"
					variant="subtle"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>
				<IconButton
					onClick={() => setUsername(generateRandomName())}
					variant="surface"
					size="lg"
					padding="1"
					height="100%"
					_hover={{ transform: "scale(1.1) rotate(180deg)" }}
				>
					<GiPerspectiveDiceSixFacesTwo
						style={{ width: "100%", height: "100%" }}
					/>
				</IconButton>
			</HStack>
			{render(username)}
		</Stack>
	);
};
