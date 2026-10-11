import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { analysisService } from '../services/api';
import { TimelineEvent } from '../types';
import { Badge } from '../components/Badge';
import {
  Clock,
  Calendar,
  AlertTriangle,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Layers,
} from 'lucide-react';

export const TemporalTimelinePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [filterPredicate, setFilterPredicate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTimeline = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await analysisService.getTimeline(id);
      setEvents(res.data.timeline_events || []);
      setAnomalies(res.data.temporal_anomalies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [id]);

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.object || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPred = !filterPredicate || e.predicate === filterPredicate;
    return matchesSearch && matchesPred;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Temporal Chronology & Sequence Analysis
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            EVENT TIME VS PUBLICATION TIME ORDERING WITH ANOMALY ISOLATION
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search timeline..."
              className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 font-mono shadow-subtle w-44"
            />
          </div>

          <select
            value={filterPredicate}
            onChange={(e) => setFilterPredicate(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 font-mono shadow-subtle"
          >
            <option value="">All Actions</option>
            <option value="EXPLOITS">EXPLOITS</option>
            <option value="ATTRIBUTED_TO">ATTRIBUTED_TO</option>
            <option value="UNAFFECTED_BY">UNAFFECTED_BY</option>
            <option value="DEPLOYS">DEPLOYS</option>
            <option value="CONTRADICTS">CONTRADICTS</option>
            <option value="CORROBORATES">CORROBORATES</option>
          </select>

          <button
            onClick={fetchTimeline}
            className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 shadow-subtle"
            title="Refresh Timeline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Temporal Anomalies Alert Banner */}
      {anomalies.length > 0 && (
        <div className="forensic-card p-4 border-red-200 bg-red-50/70 text-red-800 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-xs uppercase font-mono tracking-wider">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{anomalies.length} Temporal Anomaly Discrepancy Flagged</span>
          </div>
          {anomalies.map((anom, idx) => (
            <p key={idx} className="text-xs pl-6 leading-relaxed">
              • {anom.description}
            </p>
          ))}
        </div>
      )}

      {/* Timeline Layout */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mb-3" />
          <span className="text-xs font-mono text-slate-500">CORRELATING TEMPORAL SEQUENCE MARKS...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chronological Spine */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-2">
              {filteredEvents.map((evt, idx) => {
                const isContradicted = evt.is_contradicted === 1;
                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`relative forensic-card p-4.5 cursor-pointer forensic-card-interactive transition-all ${
                      selectedEvent?.id === evt.id ? 'border-blue-500 ring-1 ring-blue-500' : ''
                    } ${isContradicted ? 'border-red-300 bg-red-50/20' : ''}`}
                  >
                    {/* Node Dot on Timeline Spine */}
                    <div
                      className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isContradicted ? 'bg-red-600 ring-2 ring-red-200' : 'bg-blue-600'
                      }`}
                    />

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">
                          {evt.event_time ? evt.event_time.substring(0, 10) : 'APPROXIMATE / UNDATED'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">{evt.source_name}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {isContradicted && (
                          <Badge variant="critical" size="sm">
                            CONTRADICTED
                          </Badge>
                        )}
                        <Badge variant="info" size="sm">
                          {evt.predicate || 'OBSERVED'}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 font-sans mb-1">{evt.title}</h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                      {evt.description}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Source Pub: {evt.publication_time ? evt.publication_time.substring(0, 10) : 'N/A'}</span>
                      <span>Ingest: {evt.collection_time ? evt.collection_time.substring(0, 10) : 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Deep Inspector Panel */}
          <div className="forensic-card p-5 h-fit sticky top-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                Event Detail Inspector
              </h2>
            </div>

            {selectedEvent ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                    Assertion Text
                  </span>
                  <div className="font-semibold text-slate-900 font-sans leading-relaxed">
                    {selectedEvent.title}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">EVENT OCCURRED:</span>
                    <span className="font-semibold text-slate-900">{selectedEvent.event_time || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PUBLISHED:</span>
                    <span className="font-semibold text-slate-900">{selectedEvent.publication_time || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">COLLECTED:</span>
                    <span className="font-semibold text-slate-900">{selectedEvent.collection_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SOURCE:</span>
                    <span className="font-semibold text-slate-900">{selectedEvent.source_name}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase block mb-1">
                    Context Excerpt
                  </span>
                  <p className="text-slate-700 bg-white p-2.5 border border-slate-200 rounded leading-relaxed text-xs">
                    {selectedEvent.description}
                  </p>
                </div>

                {selectedEvent.is_contradicted === 1 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 space-y-1">
                    <div className="font-bold flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Evidentiary Warning</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      This event directly clashes with contradictory advisories in the evidence repository.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 font-mono text-xs">
                Click any timeline node to inspect evidentiary timestamps and provenance.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
