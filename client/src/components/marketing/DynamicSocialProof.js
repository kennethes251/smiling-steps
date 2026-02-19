/**
 * Dynamic Social Proof Component
 * 
 * Fetches real platform statistics from the API and provides them
 * to child components. Falls back to static values if API fails.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../config/api';

// Fallback static values (same as in conversionOptimization.js)
const FALLBACK_STATS = {
  happyClients: {
    value: '500+',
    label: 'Happy Clients',
    description: 'Individuals supported on their healing journey',
    icon: '😊',
    actual: 500
  },
  licensedTherapists: {
    value: '50+',
    label: 'Licensed Therapists',
    description: 'Verified mental health professionals',
    icon: '👨‍⚕️',
    actual: 50
  },
  satisfactionRate: {
    value: '95%',
    label: 'Satisfaction Rate',
    description: 'Client satisfaction with our services',
    icon: '⭐',
    actual: 95
  },
  supportAvailable: {
    value: '24/7',
    label: 'Support Available',
    description: 'Round-the-clock platform access',
    icon: '🕐',
    actual: 24
  }
};

/**
 * Custom hook to fetch platform statistics
 * 
 * @returns {Object} { stats, loading, error, isRealData }
 */
export const usePlatformStats = () => {
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRealData, setIsRealData] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/public/platform-stats`);
        
        if (response.data.success && response.data.stats) {
          setStats(response.data.stats);
          setIsRealData(response.data.stats.metadata?.source === 'database');
          console.log('✅ Platform stats loaded:', {
            source: response.data.stats.metadata?.source,
            cached: response.data.stats.metadata?.cached
          });
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('❌ Error fetching platform stats, using fallback:', err);
        setError(err.message);
        setStats(FALLBACK_STATS);
        setIsRealData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error, isRealData };
};

export default usePlatformStats;
