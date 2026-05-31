import { produce } from 'immer';
import type { GameState } from '../../types/state';
import type { Action } from '../../types/action';
import type { PlayerId } from '../../types/primitives';
import type { CharacterInstance, LeaderInstance, StageInstance, EventInstance } from '../../types/card';
import { InvalidActionError } from '../../errors';
import { moveCard } from '../mechanics';

