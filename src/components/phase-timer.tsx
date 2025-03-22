import { Box, ProgressCircle } from "@chakra-ui/react";
import { gameDurationsInMs } from "../../server/game.machine.context";
import type { GamePublicContext } from "../../server/game.machine.serialize";
import { GameClient } from "../game/game.client";
import {
	ProgressCircleRing,
	ProgressCircleValueText,
} from "./ui/progress-circle";

const initialTimeMap = {
	starting: gameDurationsInMs.startingDuration,
	preparing: gameDurationsInMs.preparingDuration,
};

export const PhaseTimer = () => {
	const actor = GameClient.useContext();
	const context = actor.context;

	let timerKey: keyof GamePublicContext["timers"] | undefined;
	if (context.timers.starting != null) {
		timerKey = "starting";
	} else if (context.timers.preparing != null) {
		timerKey = "preparing";
	} else {
		return null;
	}

	const timer = timerKey && context.timers[timerKey];
	if (timer == null) return null;

	const initialTime = initialTimeMap[timerKey] / 1000;
	const timeLeft = timer / 1000;

	const timePercentage = ((timeLeft - 1) / initialTime) * 100;

	const getColor = () => {
		if (timePercentage > 60) return "black"; // Green when plenty of time
		if (timePercentage > 30) return "#facc15"; // Yellow when time is running down
		return "#ef4444"; // Red when time is almost up
	};

	return (
		<>
			<Box
				position="absolute"
				bottom="100%"
				transform="translateY(50%)"
				left="0"
				right="0"
			>
				<Box
					bg="white"
					borderRadius="full"
					p="4"
					margin="auto"
					width="80px"
					height="80px"
					whiteSpace="nowrap"
					display="flex"
					alignItems="center"
					justifyContent="center"
					// boxShadow="0px 10px 0px 2px black, 0.5px -1px 0px 0px black"
				>
					<ProgressCircle.Root value={timePercentage}>
						<ProgressCircleRing
							css={{ "--thickness": "2px", "--size": "70px" }}
							color={getColor()}
						/>
						<ProgressCircleValueText fontSize="xl" fontWeight="bold">
							{timeLeft}
						</ProgressCircleValueText>
					</ProgressCircle.Root>
				</Box>
			</Box>
			<GameClient.Matches value={{ started: { game: "playing" } }}>
				<Box
					position="absolute"
					top="100%"
					transform="translateY(-50%)"
					left="0"
					right="0"
				>
					<Box
						width={"100%"}
						height="1rem"
						backgroundColor="#e5e7eb"
						overflow="hidden"
					>
						<Box
							key={timerKey}
							style={{
								height: "100%",
								backgroundColor: getColor(),
								width: timeLeft !== initialTime ? `${timePercentage}%` : "100%",
							}}
							transition="linear"
							transitionDuration="1s"
						/>
					</Box>
				</Box>
			</GameClient.Matches>
		</>
	);
};
