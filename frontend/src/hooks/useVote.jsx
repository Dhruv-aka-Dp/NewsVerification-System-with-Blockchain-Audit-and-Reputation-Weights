import { useState, useCallback } from 'react';
import { castVote as apiCastVote, getNewsItem } from '../utils/api';

export function useVote(itemId, initialItem = null) {
  const [item, setItem] = useState(initialItem);
  const [vote, setVote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const castVote = useCallback(async (direction, confidence) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCastVote(itemId, direction, confidence);
      setVote(data.vote);
      setItem(data.item);
      return data;
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  const refreshItem = useCallback(async () => {
    try {
      const data = await getNewsItem(itemId);
      setItem(data);
    } catch (e) {
      console.warn('Failed to refresh item:', e.message);
    }
  }, [itemId]);

  return { vote, castVote, loading, error, item, setItem, refreshItem };
}
