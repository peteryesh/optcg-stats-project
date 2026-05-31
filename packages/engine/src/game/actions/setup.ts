import { produce } from 'immer';
import type { GameState } from '../../types/state';
import type { GameAction } from '../../types/action';
import type { CardInstanceId, PlayerId } from '../../types/primitives';
import { shuffle } from '../../rng/splitmix64';
import { moveCard } from '../mechanics';
import { InvalidActionError } from '../../errors';
import { OPENING_HAND_SIZE } from '../rules';

