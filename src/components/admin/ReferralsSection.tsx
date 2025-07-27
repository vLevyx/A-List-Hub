// components/admin/ReferralsSection.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/timeout";

interface ReferralRecord {
  id: string;
  referred_player_discord_id: string;
  referrer_discord_id: string;
  referrer_username: string;
  referred_player_username: string;
  trial_start_date: string;
  premium_date: string | null;
  status: 'Trial' | 'Premium';
  days_since_trial: number;
}

interface ReferrerStats {
  discord_id: string;
  username: string;
  total_referrals: number;
  premium_conversions: number;
  active_trials: number;
  conversion_rate: number;
}

export function ReferralsSection() {
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [referrerStats, setReferrerStats] = useState<ReferrerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'referrals' | 'stats'>('referrals');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Trial' | 'Premium'>('all');

  const supabase = createClient();

  // Load all referral records
  const loadReferrals = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await withTimeout(
        supabase.rpc('get_all_referrals'),
        10000
      );

      if (error) {
        console.error('Error loading referrals:', error);
        return;
      }

      setReferrals(data || []);
    } catch (error) {
      console.error('Failed to load referrals:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Load referrer statistics
  const loadReferrerStats = useCallback(async () => {
    try {
      // Get unique referrers from referrals
      const { data: uniqueReferrers, error: referrersError } = await supabase
        .from('referrals')
        .select('referrer_discord_id, referrer_username')
        .order('referrer_username');

      if (referrersError) {
        console.error('Error loading referrers:', referrersError);
        return;
      }

      if (!uniqueReferrers || uniqueReferrers.length === 0) {
        setReferrerStats([]);
        return;
      }

      // Remove duplicates using Array.from and Set
      const uniqueReferrerMap = new Map();
      uniqueReferrers.forEach(ref => {
        uniqueReferrerMap.set(ref.referrer_discord_id, ref);
      });

      const stats: ReferrerStats[] = [];

      // Get stats for each referrer - convert Map to Array properly
      const referrerEntries = Array.from(uniqueReferrerMap.entries());
      
      for (const [discordId, referrerInfo] of referrerEntries) {
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_referrer_stats', { p_referrer_discord_id: discordId });

        if (!statsError && statsData) {
          stats.push({
            discord_id: discordId,
            username: referrerInfo.referrer_username,
            total_referrals: statsData.total_referrals,
            premium_conversions: statsData.premium_conversions,
            active_trials: statsData.active_trials,
            conversion_rate: statsData.conversion_rate
          });
        }
      }

      // Sort by total referrals descending
      stats.sort((a, b) => b.total_referrals - a.total_referrals);
      setReferrerStats(stats);

    } catch (error) {
      console.error('Failed to load referrer stats:', error);
    }
  }, [supabase]);

  // Initial load
  useEffect(() => {
    loadReferrals();
    loadReferrerStats();
  }, [loadReferrals, loadReferrerStats]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('referrals-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referrals' },
        () => {
          console.log('Referrals changed, refreshing...');
          loadReferrals();
          loadReferrerStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReferrals, loadReferrerStats, supabase]);

  // Filter referrals based on search and status
  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = !searchTerm || 
      referral.referred_player_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referrer_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referred_player_discord_id.includes(searchTerm) ||
      referral.referrer_discord_id.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || referral.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, daysSinceTrial: number) => {
    if (status === 'Premium') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Premium
        </span>
      );
    }

    // Trial status with urgency based on days
    let badgeClass = "bg-blue-100 text-blue-800";
    if (daysSinceTrial > 7) {
      badgeClass = "bg-red-100 text-red-800";
    } else if (daysSinceTrial > 5) {
      badgeClass = "bg-yellow-100 text-yellow-800";
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
        Trial ({daysSinceTrial}d)
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00c6ff]"></div>
        <span className="ml-3 text-white/70">Loading referrals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Referral Tracking</h2>
        <div className="flex items-center gap-4">
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('referrals')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'referrals'
                  ? 'bg-[#00c6ff] text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Referrals ({referrals.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-[#00c6ff] text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Referrer Stats ({referrerStats.length})
            </button>
          </div>
        </div>
      </div>

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by username or Discord ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#00c6ff]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
            >
              <option value="all">All Status</option>
              <option value="Trial">Trial</option>
              <option value="Premium">Premium</option>
            </select>
          </div>

          {/* Referrals Table */}
          <div className="bg-white/5 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Referred Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Referrer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Trial Start
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Premium Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-white/50">
                        {referrals.length === 0 ? 'No referrals found' : 'No referrals match your filters'}
                      </td>
                    </tr>
                  ) : (
                    filteredReferrals.map((referral) => (
                      <tr key={referral.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {referral.referred_player_username}
                            </div>
                            <div className="text-xs text-white/50">
                              {referral.referred_player_discord_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {referral.referrer_username}
                            </div>
                            <div className="text-xs text-white/50">
                              {referral.referrer_discord_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(referral.status, referral.days_since_trial)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {formatDate(referral.trial_start_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {formatDate(referral.premium_date)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Referrer Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">
                {referrerStats.reduce((sum, stat) => sum + stat.total_referrals, 0)}
              </div>
              <div className="text-sm text-white/70">Total Referrals</div>
            </div>
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">
                {referrerStats.reduce((sum, stat) => sum + stat.premium_conversions, 0)}
              </div>
              <div className="text-sm text-white/70">Premium Conversions</div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">
                {referrerStats.reduce((sum, stat) => sum + stat.active_trials, 0)}
              </div>
              <div className="text-sm text-white/70">Active Trials</div>
            </div>
          </div>

          {/* Referrer Stats Table */}
          <div className="bg-white/5 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Referrer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Total Referrals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Premium Conversions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Active Trials
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Conversion Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Potential Earnings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {referrerStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                        No referrer statistics available
                      </td>
                    </tr>
                  ) : (
                    referrerStats.map((stat) => (
                      <tr key={stat.discord_id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {stat.username}
                            </div>
                            <div className="text-xs text-white/50">
                              {stat.discord_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-blue-300">
                            {stat.total_referrals}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-green-300">
                            {stat.premium_conversions}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-yellow-300">
                            {stat.active_trials}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-white">
                              {stat.conversion_rate}%
                            </div>
                            <div className="ml-2 flex-1 bg-white/10 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                                style={{ width: `${Math.min(stat.conversion_rate, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-[#ffd700]">
                            ELAN${(stat.premium_conversions * 250000).toLocaleString()}
                          </div>
                          <div className="text-xs text-white/50">
                            (10% of ELAN$2.5M × {stat.premium_conversions})
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Referrers */}
          {referrerStats.length > 0 && (
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">🏆 Top Referrers</h3>
              <div className="space-y-3">
                {referrerStats.slice(0, 5).map((stat, index) => (
                  <div key={stat.discord_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-white/10 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{stat.username}</div>
                        <div className="text-xs text-white/50">{stat.total_referrals} referrals</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-300">
                        {stat.premium_conversions} conversions
                      </div>
                      <div className="text-xs text-white/50">
                        {stat.conversion_rate}% rate
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}