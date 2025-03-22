import { type MachineContext, type StateMachine } from "xstate";

export type OverrideStateMachineContext<
	TMachine extends StateMachine<
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any,
		any
	>,
	TNewContext extends MachineContext,
> = TMachine extends StateMachine<
	infer _TOldContext,
	infer TEvent,
	infer TChildren,
	infer TActor,
	infer TAction,
	infer TGuard,
	infer TDelay,
	infer TStateValue,
	infer TTag,
	infer TInput,
	infer TOutput,
	infer TEmitted,
	infer TMeta,
	infer TConfig
>
	? StateMachine<
			TNewContext,
			TEvent,
			TChildren,
			TActor,
			TAction,
			TGuard,
			TDelay,
			TStateValue,
			TTag,
			TInput,
			TOutput,
			TEmitted,
			TMeta,
			TConfig
		>
	: never;
