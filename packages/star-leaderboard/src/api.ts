/**
 * Direct API client for standalone mode (non-platform usage)
 */

import type {
  SubmitResult,
  LeaderboardData,
  GetScoresOptions,
  ShareOptions,
  ShareResult,
} from './index';

export interface SubmitOptions {
  /** Player name to associate with the score */
  playerName?: string;
  /** Sort preference: 'asc' (lower is better) or 'desc' (higher is better) */
  sort?: 'asc' | 'desc';
}

export interface ApiClient {
  submit(gameId: string, score: number, options?: SubmitOptions): Promise<SubmitResult>;
  getScores(gameId: string, options?: GetScoresOptions & { playerName?: string }): Promise<LeaderboardData>;
  share(gameId: string, options?: ShareOptions): Promise<ShareResult>;
}

/**
 * Creates an API client for direct HTTP calls to the Star backend.
 */
export function createApiClient(apiBase: string = ''): ApiClient {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${apiBase}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  return {
    async submit(gameId: string, score: number, options?: SubmitOptions): Promise<SubmitResult> {
      try {
        const encodedGameId = encodeURIComponent(gameId);
        const body: { score: number; playerName?: string; sort?: string } = { score };
        if (options?.playerName) {
          body.playerName = options.playerName;
        }
        if (options?.sort) {
          body.sort = options.sort.toUpperCase();
        }
        const result = await request<{
          success: boolean;
          rank?: number;
          scoreId?: string;
        }>('POST', `/api/sdk/leaderboard/${encodedGameId}/submit`, body);

        return {
          success: result.success,
          rank: result.rank,
          scoreId: result.scoreId,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },

    async getScores(
      gameId: string,
      options: GetScoresOptions & { playerName?: string } = {}
    ): Promise<LeaderboardData> {
      try {
        const params = new URLSearchParams();
        if (options.limit) params.set('limit', String(options.limit));
        if (options.timeframe) params.set('timeframe', options.timeframe);
        if (options.playerName) params.set('playerName', options.playerName);

        const queryString = params.toString();
        const encodedGameId = encodeURIComponent(gameId);
        const path = `/api/sdk/leaderboard/${encodedGameId}${queryString ? `?${queryString}` : ''}`;

        const result = await request<{
          scores: Array<{
            id: string;
            leaderboardId: string;
            userId: string | null;
            playerName: string | null;
            score: number;
            submittedAt: string;
            rank?: number;
          }>;
          config?: {
            sort?: 'ASC' | 'DESC';
            valueType?: 'score' | 'time' | 'moves' | 'attempts' | 'strokes';
          };
          timeframe: 'weekly' | 'all_time';
          you?: {
            id: string;
            leaderboardId: string;
            userId: string | null;
            playerName: string | null;
            score: number;
            submittedAt: string;
            rank?: number;
          } | null;
          weekResetTime?: number | null;
        }>('GET', path);

        return {
          scores: result.scores.map((s, i) => ({
            id: s.id,
            playerName: s.playerName,
            score: s.score,
            rank: s.rank ?? i + 1,
            submittedAt: s.submittedAt,
          })),
          config: result.config,
          timeframe: result.timeframe,
          you: result.you
            ? {
                id: result.you.id,
                playerName: result.you.playerName,
                score: result.you.score,
                rank: result.you.rank ?? 0,
                submittedAt: result.you.submittedAt,
              }
            : null,
          weekResetTime: result.weekResetTime,
        };
      } catch {
        // Return empty data on error - impl.ts will log the warning
        return {
          scores: [],
          timeframe: options.timeframe ?? 'weekly',
          you: null,
        };
      }
    },

    async share(gameId: string, options: ShareOptions = {}): Promise<ShareResult> {
      try {
        const encodedGameId = encodeURIComponent(gameId);
        const result = await request<{
          shareUrl?: string;
        }>('POST', `/api/sdk/leaderboard/${encodedGameId}/share`, {
          gameTitle: options.gameTitle,
          score: options.score,
          playerName: options.playerName,
        });

        return {
          success: true,
          shareUrl: result.shareUrl,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
  };
}
