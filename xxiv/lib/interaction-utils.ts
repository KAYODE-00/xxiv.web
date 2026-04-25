import type { InteractionAction } from '@/types';

export function remapInteractionAction(
  action: InteractionAction | undefined,
  remapLayerId: (layerId: string) => string
): InteractionAction | undefined {
  if (!action) return action;

  if (action.type === 'show-hide') {
    return {
      ...action,
      targetLayerId: remapLayerId(action.targetLayerId),
    };
  }

  return action;
}
