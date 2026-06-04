import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, CircularProgress, Alert,
  Tooltip, IconButton, TextField, Button,
} from '@mui/material';
import { Save, DeleteOutline, InfoOutlined } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import api from '../utils/api';

// ── MITRE-inspired phases ────────────────────────────────────────────────────
const PHASES = [
  { id: 'RECONNAISSANCE',       label: 'Reconnaissance',       icon: '🔭', color: '#2471a3' },
  { id: 'INITIAL_ACCESS',       label: 'Initial Access',       icon: '🚪', color: '#1e8449' },
  { id: 'EXECUTION',            label: 'Execution',            icon: '⚡', color: '#d35400' },
  { id: 'PERSISTENCE',          label: 'Persistence',          icon: '🔗', color: '#8e44ad' },
  { id: 'PRIVILEGE_ESCALATION', label: 'Privilege Escalation', icon: '⬆️', color: '#c0392b' },
  { id: 'CREDENTIAL_ACCESS',    label: 'Credential Access',    icon: '🔑', color: '#f39c12' },
  { id: 'LATERAL_MOVEMENT',     label: 'Lateral Movement',     icon: '↔️', color: '#16a085' },
  { id: 'EXFILTRATION',         label: 'Exfiltration',         icon: '📤', color: '#e74c3c' },
];

const SEV_COLOR = {
  CRITICAL: '#d32f2f', HIGH: '#f57c00', MEDIUM: '#f9a825',
  LOW: '#388e3c', INFORMATIONAL: '#1976d2',
};

// ── Draggable finding card ────────────────────────────────────────────────────
function FindingCard({ finding, inChain, onRemove, isDragging, dragRef, dragStyle }) {
  const sev = finding.finding_severity || finding.severity || 'LOW';
  return (
    <Box
      ref={dragRef}
      style={dragStyle}
      sx={{
        p: 1, mb: 0.75, borderRadius: 1,
        bgcolor: isDragging ? 'action.selected' : 'background.paper',
        border: `1px solid`,
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderLeft: `4px solid ${SEV_COLOR[sev] || '#999'}`,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        userSelect: 'none',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5,
        '&:hover': { borderColor: 'primary.light', boxShadow: 1 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {finding.finding_title || finding.title}
        </Typography>
        <Chip label={sev} size="small"
          sx={{ mt: 0.3, height: 16, fontSize: '0.6rem', bgcolor: SEV_COLOR[sev] + '20', color: SEV_COLOR[sev], border: `1px solid ${SEV_COLOR[sev]}40` }} />
      </Box>
      {inChain && onRemove && (
        <Tooltip title="Remove from chain">
          <IconButton size="small" onClick={e => { e.stopPropagation(); onRemove(finding.id || finding.finding); }}
            sx={{ flexShrink: 0, p: 0.25 }}>
            <DeleteOutline sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

// ── Droppable phase column ────────────────────────────────────────────────────
function PhaseColumn({ phase, entries, isOver, onRemove }) {
  const theme = useTheme();
  return (
    <Box sx={{
      minWidth: 180, maxWidth: 200, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      border: `2px solid`,
      borderColor: isOver ? phase.color : 'divider',
      borderRadius: 2,
      transition: 'border-color 0.15s',
      bgcolor: isOver ? `${phase.color}10` : (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
      overflow: 'hidden',
    }}>
      {/* Column header */}
      <Box sx={{ p: 1, bgcolor: phase.color, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ fontSize: '1rem' }}>{phase.icon}</Typography>
        <Box>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            {phase.label}
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)' }}>
            {entries.length} finding{entries.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>
      {/* Drop zone */}
      <Box sx={{ p: 0.75, flex: 1, minHeight: 120 }}>
        {entries.length === 0 ? (
          <Box sx={{ height: '100%', minHeight: 80, border: '2px dashed', borderColor: isOver ? phase.color : 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', textAlign: 'center' }}>
              Drop findings here
            </Typography>
          </Box>
        ) : (
          entries.map(e => (
            <FindingCard key={e.id || e.finding} finding={e} inChain onRemove={onRemove} />
          ))
        )}
      </Box>
    </Box>
  );
}

// ── Main AttackChain component ────────────────────────────────────────────────
export default function AttackChain({ reportId, findings }) {
  const theme = useTheme();
  const [chain, setChain]       = useState({});   // { PHASE_ID: [entry, ...] }
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [activeId, setActiveId] = useState(null); // dragging finding id
  const [overPhase, setOverPhase] = useState(null);
  const saveTimer = useRef(null);

  // Build initial empty chain
  const emptyChain = useCallback(() =>
    Object.fromEntries(PHASES.map(p => [p.id, []])),
  []);

  // Load saved chain
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/reports/${reportId}/attack_chain/`);
        const grouped = emptyChain();
        (res.data || []).forEach(e => {
          if (grouped[e.phase]) grouped[e.phase].push(e);
        });
        setChain(grouped);
      } catch { setChain(emptyChain()); }
      setLoading(false);
    };
    load();
  }, [reportId, emptyChain]);

  // IDs already placed in any phase
  const placedIds = new Set(
    Object.values(chain).flat().map(e => e.finding)
  );

  const unplaced = findings.filter(f => !placedIds.has(f.id));

  // Save to backend
  const saveChain = useCallback(async (chainData) => {
    setSaving(true);
    setSaved(false);
    try {
      const entries = Object.entries(chainData).flatMap(([phase, items]) =>
        items.map((e, i) => ({ finding: e.finding || e.id, phase, position: i, notes: e.notes || '' }))
      );
      await api.post(`/reports/${reportId}/attack_chain_update/`, { entries });
      setSaved(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaved(false), 2500);
    } catch (err) { console.error(err); }
    setSaving(false);
  }, [reportId]);

  // dnd-kit sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeFinding = activeId
    ? (findings.find(f => f.id === activeId) || Object.values(chain).flat().find(e => (e.finding || e.id) === activeId))
    : null;

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
  };

  const handleDragOver = ({ over }) => {
    setOverPhase(over?.id || null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    setOverPhase(null);
    if (!over) return;
    const targetPhase = over.id;
    if (!PHASES.find(p => p.id === targetPhase)) return;

    const findingId = active.id;
    const finding   = findings.find(f => f.id === findingId);
    if (!finding) return;

    // Remove from any existing phase
    const newChain = { ...chain };
    Object.keys(newChain).forEach(ph => {
      newChain[ph] = newChain[ph].filter(e => (e.finding || e.id) !== findingId);
    });

    // Add to target phase
    newChain[targetPhase] = [
      ...newChain[targetPhase],
      { finding: findingId, finding_title: finding.title, finding_severity: finding.severity, finding_status: finding.status, phase: targetPhase, position: newChain[targetPhase].length, notes: '' },
    ];

    setChain(newChain);
    saveChain(newChain);
  };

  const handleRemove = useCallback((findingId) => {
    setChain(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(ph => {
        next[ph] = next[ph].filter(e => (e.finding || e.id) !== findingId);
      });
      saveChain(next);
      return next;
    });
  }, [saveChain]);

  if (loading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;

  const usedPhases  = PHASES.filter(p => chain[p.id]?.length > 0);
  const totalPlaced = Object.values(chain).flat().length;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>

        {/* ── Left panel: unplaced findings ── */}
        <Box sx={{ width: 220, flexShrink: 0 }}>
          <Paper sx={{ p: 1.5, position: 'sticky', top: 16 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>Findings</Typography>
              <Chip label={unplaced.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.68rem' }}>
              Drag findings into the attack phases →
            </Typography>
            {findings.length === 0 && (
              <Alert severity="info" sx={{ fontSize: '0.75rem' }}>No findings added to this report yet.</Alert>
            )}
            {unplaced.length === 0 && findings.length > 0 && (
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>All findings placed ✓</Typography>
            )}
            {unplaced.map(f => (
              <DraggableFinding key={f.id} finding={f} />
            ))}

            {totalPlaced > 0 && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>IN CHAIN</Typography>
                {Object.entries(chain).flatMap(([phase, items]) =>
                  items.map(e => (
                    <Box key={e.finding || e.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PHASES.find(p => p.id === phase)?.color || '#999', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.finding_title}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            )}
          </Paper>
        </Box>

        {/* ── Right: phase columns ── */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Attack Chain</Typography>
              <Typography variant="body2" color="text.secondary">
                Drag findings into MITRE ATT&CK phases to visualise the kill chain
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {saved && <Typography variant="caption" color="success.main" fontWeight={600}>Saved ✓</Typography>}
              {saving && <CircularProgress size={16} />}
              <Button size="small" variant="outlined" startIcon={<Save />} onClick={() => saveChain(chain)} disabled={saving}>
                Save
              </Button>
            </Box>
          </Box>

          {/* Phase legend */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
            {PHASES.map(p => (
              <Chip key={p.id} label={`${p.icon} ${p.label}`} size="small"
                sx={{ fontSize: '0.62rem', height: 20, bgcolor: chain[p.id]?.length > 0 ? p.color + '20' : 'transparent', color: chain[p.id]?.length > 0 ? p.color : 'text.disabled', border: `1px solid ${chain[p.id]?.length > 0 ? p.color : 'transparent'}` }} />
            ))}
          </Box>

          {/* Scrollable columns row */}
          <Box sx={{ overflowX: 'auto', pb: 1 }}>
            <Box sx={{ display: 'flex', gap: 1.5, minWidth: 'max-content' }}>
              {PHASES.map(phase => (
                <DroppablePhase key={phase.id} phase={phase} entries={chain[phase.id] || []} isOver={overPhase === phase.id} onRemove={handleRemove} />
              ))}
            </Box>
          </Box>

          {usedPhases.length > 0 && (
            <Box sx={{ mt: 3, p: 2.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                Attack Chain Flow
              </Typography>
              <Box sx={{ overflowX: 'auto', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>
                  {usedPhases.map((p, i) => {
                    const entries = chain[p.id] || [];
                    return (
                      <React.Fragment key={p.id}>
                        {/* Phase node */}
                        <Box sx={{ width: 280, display: 'flex', flexDirection: 'column' }}>
                          {/* Phase header */}
                          <Box sx={{
                            px: 1.5, py: 1, bgcolor: p.color, borderRadius: '8px 8px 0 0',
                            display: 'flex', alignItems: 'center', gap: 0.75,
                          }}>
                            <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{p.icon}</Typography>
                            <Box>
                              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
                                {p.label.toUpperCase()}
                              </Typography>
                              <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.75)' }}>
                                {entries.length} finding{entries.length !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          </Box>
                          {/* Finding cards */}
                          <Box sx={{
                            border: `1px solid ${p.color}60`, borderTop: 'none', borderRadius: '0 0 8px 8px',
                            bgcolor: `${p.color}08`, p: 1, display: 'flex', flexDirection: 'column', gap: 0.75,
                            minHeight: 60,
                          }}>
                            {entries.map(e => {
                              const full       = findings.find(f => f.id === (e.finding || e.id));
                              const sev        = e.finding_severity || full?.severity || 'LOW';
                              const asset      = full?.affected_asset || '';
                              const cvss       = full?.cvss_score;
                              const strip      = (html) => (html || '').replace(/<[^>]+>/g, '').trim();
                              const descText   = strip(full?.description);
                              const impactText = strip(full?.impact);
                              return (
                                <Box key={e.finding || e.id} sx={{
                                  bgcolor: 'background.paper',
                                  border: `1px solid ${SEV_COLOR[sev]}40`,
                                  borderLeft: `4px solid ${SEV_COLOR[sev]}`,
                                  borderRadius: 1, p: 1.25,
                                }}>
                                  {/* Title */}
                                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.35, mb: 0.75 }}>
                                    {e.finding_title || full?.title}
                                  </Typography>

                                  {/* Chips row */}
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                                    <Chip label={sev} size="small"
                                      sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: SEV_COLOR[sev] + '20', color: SEV_COLOR[sev], border: `1px solid ${SEV_COLOR[sev]}50` }} />
                                    {cvss && (
                                      <Chip label={`CVSS ${cvss}`} size="small"
                                        sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'grey.100', color: 'text.secondary' }} />
                                    )}
                                    {asset && (
                                      <Chip label={`📍 ${asset}`} size="small"
                                        sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'grey.100', color: 'text.secondary' }} />
                                    )}
                                  </Box>

                                  {/* Description */}
                                  {descText && (
                                    <Box sx={{ mb: impactText ? 1 : 0 }}>
                                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>
                                        Description
                                      </Typography>
                                      <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.55 }}>
                                        {descText}
                                      </Typography>
                                    </Box>
                                  )}

                                  {/* Impact */}
                                  {impactText && (
                                    <Box sx={{ pt: 0.75, borderTop: '1px dashed', borderColor: `${SEV_COLOR[sev]}30` }}>
                                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>
                                        ⚠ Impact
                                      </Typography>
                                      <Typography sx={{ fontSize: '0.68rem', color: '#c0392b', lineHeight: 1.55 }}>
                                        {impactText}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        </Box>

                        {/* Arrow connector */}
                        {i < usedPhases.length - 1 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, pt: '28px', flexShrink: 0 }}>
                            <Box sx={{ width: 28, height: 2, bgcolor: 'divider', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Typography sx={{ fontSize: '0.9rem', color: 'text.disabled', lineHeight: 1, mr: -0.5 }}>▶</Typography>
                            </Box>
                          </Box>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Drag overlay */}
      <DragOverlay>
        {activeFinding ? (
          <Box sx={{ p: 1, bgcolor: 'background.paper', border: '2px solid', borderColor: 'primary.main', borderRadius: 1, boxShadow: 4, width: 180, opacity: 0.95 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
              {activeFinding.finding_title || activeFinding.title}
            </Typography>
            <Chip label={activeFinding.finding_severity || activeFinding.severity} size="small"
              sx={{ mt: 0.3, height: 16, fontSize: '0.6rem' }} />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DraggableFinding({ finding }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: finding.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <Box ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <FindingCard finding={finding} inChain={false} isDragging={isDragging} />
    </Box>
  );
}

function DroppablePhase({ phase, entries, isOver, onRemove }) {
  const { setNodeRef } = useDroppable({ id: phase.id });
  return (
    <Box ref={setNodeRef}>
      <PhaseColumn phase={phase} entries={entries} isOver={isOver} onRemove={onRemove} />
    </Box>
  );
}
