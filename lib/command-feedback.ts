import type { AcceptedCommandResponse, BrokerCommandType, CommandFeedback, CommandStatus, GuildSettingsSaveResponse } from '@/lib/api';

const COMMAND_TYPE_LABELS: Record<BrokerCommandType, string> = {
	GUILD_SETTINGS_UPDATE: 'Guild settings',
	PLAYER_JOIN: 'Join voice channel',
	PLAYER_LEAVE: 'Leave voice channel',
	PLAYER_PREVIOUS: 'Previous track',
	PLAYER_SKIP: 'Skip track',
	PLAYER_QUEUE_REMOVE: 'Remove queued track',
	PLAYER_SHUFFLE: 'Shuffle queue',
	PLAYER_REPEAT: 'Repeat mode',
	PLAYER_PAUSE: 'Pause playback',
	PLAYER_RESUME: 'Resume playback',
	PLAYER_STOP: 'Stop playback',
	PLAYER_VOLUME: 'Volume update',
	PLAYER_SEEK: 'Seek track',
	PLAYER_AUTOPLAY: 'Autoplay',
	PLAYER_BASSBOOST: 'Bassboost',
	PLAYER_SPEED: 'Playback speed',
	PLAYER_FILTER_TOGGLE: 'Filter toggle',
	PLAYER_FILTER_RESET: 'Filter reset',
};

export const DEFAULT_COMMAND_FEEDBACK: CommandFeedback = {
	phase: 'idle',
	title: 'Ready for the next action',
	message: 'Playback and save results will appear here.',
};

export function formatCommandTypeLabel(commandType?: BrokerCommandType) {
	if (!commandType) return 'Dashboard action';
	return COMMAND_TYPE_LABELS[commandType] ?? commandType;
}

export function formatCommandFeedbackPhase(phase: CommandFeedback['phase']) {
	switch (phase) {
		case 'sending':
			return 'Sending';
		case 'accepted':
			return 'Queued';
		case 'received':
			return 'Received';
		case 'succeeded':
			return 'Applied';
		case 'failed':
			return 'Failed';
		case 'timed_out':
			return 'Timed out';
		default:
			return 'Ready';
	}
}

export function getCommandFeedbackToneClasses(phase: CommandFeedback['phase']) {
	switch (phase) {
		case 'succeeded':
			return 'border-primary/20 bg-primary/10 text-primary';
		case 'failed':
		case 'timed_out':
			return 'border-danger/30 bg-danger/10 text-red-100';
		case 'received':
			return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100';
		case 'accepted':
		case 'sending':
			return 'border-white/10 bg-white/[0.04] text-white/80';
		default:
			return 'border-white/10 bg-black/25 text-muted';
	}
}

export function formatShortCommandId(commandId?: string) {
	if (!commandId) return '--';
	if (commandId.length <= 14) return commandId;
	return `${commandId.slice(0, 8)}...${commandId.slice(-4)}`;
}

export function buildSendingCommandFeedback(commandType: BrokerCommandType, message = 'Sending this request to Lunio.'): CommandFeedback {
	return {
		phase: 'sending',
		commandType,
		title: `Sending ${formatCommandTypeLabel(commandType)}`,
		message,
		updatedAt: Date.now(),
	};
}

export function buildAcceptedCommandFeedback(accepted: AcceptedCommandResponse): CommandFeedback {
	return {
		phase: 'accepted',
		commandId: accepted.commandId,
		commandType: accepted.commandType,
		instanceId: accepted.instanceId,
		title: `${formatCommandTypeLabel(accepted.commandType)} queued`,
		message: 'Waiting for Lunio to receive this command.',
		updatedAt: Date.now(),
	};
}

export function buildCommandFeedbackFromStatus(status: CommandStatus): CommandFeedback {
	const base = {
		commandId: status.commandId,
		commandType: status.commandType,
		instanceId: status.instanceId,
		ackTimestamp: status.ack?.timestamp,
		updatedAt: status.updatedAt,
	};

	if (status.result) {
		return {
			...base,
			phase: status.result.success ? 'succeeded' : 'failed',
			title: `${formatCommandTypeLabel(status.commandType)} ${status.result.success ? 'applied' : 'failed'}`,
			message: status.result.message,
			code: status.result.code,
			resultTimestamp: status.result.timestamp,
		};
	}

	if (status.ack) {
		return {
			...base,
			phase: 'received',
			title: `${formatCommandTypeLabel(status.commandType)} received by Lunio`,
			message: 'Waiting for Lunio to finish this action.',
		};
	}

	return {
		...base,
		phase: 'accepted',
		title: `${formatCommandTypeLabel(status.commandType)} queued`,
		message: 'Waiting for Lunio to receive this command.',
	};
}

export function buildSettingsSaveFeedback(response: GuildSettingsSaveResponse): CommandFeedback {
	return {
		phase: response.command.result.success ? 'succeeded' : 'failed',
		commandId: response.command.commandId,
		commandType: response.command.commandType,
		instanceId: response.command.instanceId,
		ackTimestamp: response.command.ack?.timestamp,
		resultTimestamp: response.command.result.timestamp,
		updatedAt: response.settings.updatedAt,
		code: response.command.result.code,
		title: response.command.result.success ? 'Guild settings applied by Lunio' : 'Guild settings update failed',
		message: response.command.result.message,
	};
}

export function buildFailedCommandFeedback(message: string, commandType?: BrokerCommandType): CommandFeedback {
	return {
		phase: 'failed',
		commandType,
		title: commandType ? `${formatCommandTypeLabel(commandType)} failed` : 'Request failed',
		message,
		updatedAt: Date.now(),
	};
}

export function buildTimedOutCommandFeedback(current?: CommandFeedback): CommandFeedback {
	return {
		phase: 'timed_out',
		commandId: current?.commandId,
		commandType: current?.commandType,
		instanceId: current?.instanceId,
		ackTimestamp: current?.ackTimestamp,
		updatedAt: Date.now(),
		title: `${formatCommandTypeLabel(current?.commandType)} timed out`,
		message: 'Lunio did not return a final result in time. Refresh state and try again if needed.',
	};
}
