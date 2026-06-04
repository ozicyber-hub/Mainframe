import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, IconButton, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControlLabel, Checkbox, Alert,
  List, ListItem, ListItemText, ListItemSecondaryAction, ListItemIcon, Divider,
  Tooltip, CircularProgress, Card, CardContent, Avatar,
  ToggleButtonGroup, ToggleButton, InputAdornment, Switch,
  Tab, Tabs, LinearProgress, Snackbar,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Add, Sync, Check, Close,
  Event as EventIcon, Assignment as TaskIcon, Schedule as ScheduleIcon,
  OpenInNew, Search, People, CalendarViewMonth, ViewWeek,
  Comment as CommentIcon, CheckCircle, RadioButtonUnchecked,
  Send, Handshake, AttachFile, Download, DeleteOutline,
  DragIndicator, WeekendOutlined, EditOutlined, ViewList, GridView,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

// ─── Color maps ──────────────────────────────────────────────────────────────
// GRC assessment status colours
const GRC_STATUS = {
  DRAFT:       { bg: '#f3f0ff', border: '#7c3aed', text: '#5b21b6', label: 'Draft' },
  IN_PROGRESS: { bg: '#ede9fe', border: '#6d28d9', text: '#4c1d95', label: 'In Progress' },
  COMPLETED:   { bg: '#ecfdf5', border: '#059669', text: '#065f46', label: 'Completed' },
  ARCHIVED:    { bg: '#f5f5f5', border: '#6b7280', text: '#374151', label: 'Archived' },
};

const GRC_PROJECT_STATUS = {
  ACTIVE:    { bg: '#e0f2fe', border: '#0284c7', text: '#075985', label: 'Active' },
  COMPLETED: { bg: '#ecfdf5', border: '#059669', text: '#065f46', label: 'Completed' },
  ARCHIVED:  { bg: '#f5f5f5', border: '#6b7280', text: '#374151', label: 'Archived' },
};

const EVENT_COLORS = {
  ENGAGEMENT_START:   '#24483E',
  ENGAGEMENT_END:     '#c0392b',
  TESTING_WINDOW:     '#d35400',
  REPORT_DUE:         '#8e44ad',
  KICKOFF:            '#2980b9',
  DEBRIEF:            '#16a085',
  HANDOVER:           '#f39c12',
  RETEST:             '#1abc9c',
  SCOPING:            '#2471a3',
  REMEDIATION_REVIEW: '#884ea0',
  CLIENT_MEETING:     '#148f77',
  INTERNAL_REVIEW:    '#0277bd',
  LEAVE:              '#e74c3c',
  OTHER:              '#7b1fa2',
};

const EVENT_ICONS = {
  ENGAGEMENT_START:   '🚀',
  ENGAGEMENT_END:     '🏁',
  TESTING_WINDOW:     '🔍',
  REPORT_DUE:         '📄',
  KICKOFF:            '🤝',
  DEBRIEF:            '📊',
  HANDOVER:           '🔄',
  RETEST:             '✅',
  SCOPING:            '📐',
  REMEDIATION_REVIEW: '🛠️',
  CLIENT_MEETING:     '💼',
  INTERNAL_REVIEW:    '🔒',
  LEAVE:              '🏖️',
  OTHER:              '📌',
};

const ENG_STATUS = {
  PLANNING:   { bg: '#e3f2fd', border: '#1565c0', text: '#1565c0', label: 'Planning' },
  ACTIVE:     { bg: '#e8f5e9', border: '#2e7d32', text: '#2e7d32', label: 'Active' },
  REPORTING:  { bg: '#fff3e0', border: '#e65100', text: '#e65100', label: 'Reporting' },
  REVIEW:     { bg: '#fce4ec', border: '#c62828', text: '#c62828', label: 'Review' },
  COMPLETED:  { bg: '#f5f5f5', border: '#616161', text: '#616161', label: 'Completed' },
  ON_HOLD:    { bg: '#fffde7', border: '#f57f17', text: '#f57f17', label: 'On Hold' },
  CANCELLED:  { bg: '#efebe9', border: '#4e342e', text: '#4e342e', label: 'Cancelled' },
};

const PRIORITY_COLORS = { LOW: '#49A58B', MEDIUM: '#f39c12', HIGH: '#E17468', URGENT: '#c0392b' };
const TASK_STATUS_COLORS = { TODO: '#7f8c8d', IN_PROGRESS: '#2980b9', BLOCKED: '#c0392b', REVIEW: '#d35400', DONE: '#27ae60' };

const TASK_STATUSES = [
  { value: 'TODO',        label: 'To Do',       color: '#7f8c8d' },
  { value: 'IN_PROGRESS', label: 'In Progress',  color: '#2980b9' },
  { value: 'BLOCKED',     label: 'Blocked',      color: '#c0392b' },
  { value: 'REVIEW',      label: 'In Review',    color: '#d35400' },
  { value: 'DONE',        label: 'Done',         color: '#27ae60' },
];

const PRIORITIES = [
  { value: 'LOW',    label: 'Low',    color: '#49A58B' },
  { value: 'MEDIUM', label: 'Medium', color: '#f39c12' },
  { value: 'HIGH',   label: 'High',   color: '#E17468' },
  { value: 'URGENT', label: 'Urgent', color: '#c0392b' },
];

const EVENT_TYPES = [
  { value: 'TESTING_WINDOW',     label: 'Active Testing' },
  { value: 'KICKOFF',            label: 'Kickoff Meeting' },
  { value: 'DEBRIEF',            label: 'Debrief / Closeout' },
  { value: 'HANDOVER',           label: 'Tester Handover' },
  { value: 'RETEST',             label: 'Re-test / Verification' },
  { value: 'SCOPING',            label: 'Scoping Call' },
  { value: 'REMEDIATION_REVIEW', label: 'Remediation Review' },
  { value: 'CLIENT_MEETING',     label: 'Client Meeting' },
  { value: 'INTERNAL_REVIEW',    label: 'Internal Review' },
  { value: 'REPORT_DUE',         label: 'Report Due' },
  { value: 'LEAVE',              label: 'Leave / Holiday' },
  { value: 'OTHER',              label: 'Other' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildCalendarGrid(year, month) {
  const first = dayjs(new Date(year, month, 1));
  const startPad = first.day();
  const daysInMonth = first.daysInMonth();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(dayjs(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
}

const sameId = (a, b) => Number(a) === Number(b);
const hasId = (items = [], id) => items.some(item => sameId(item, id));
const withoutId = (items = [], id) => items.filter(item => !sameId(item, id));
const getGrcConsultantId = (assessment) => assessment?.grc_consultant_id ?? assessment?.grc_consultant ?? null;

// ─── Sub-components ──────────────────────────────────────────────────────────
function EventChip({ event, onClick }) {
  const color = EVENT_COLORS[event.event_type] || '#7b1fa2';
  const icon  = EVENT_ICONS[event.event_type] || '📌';
  const time  = event.all_day ? null : event.start_date?.slice(11, 16);
  return (
    <Box onClick={(e) => { e.stopPropagation(); onClick(event); }}
      sx={{
        bgcolor: event.is_completed ? '#f0f0f0' : `${color}18`,
        color: event.is_completed ? '#999' : color,
        border: `1px solid ${event.is_completed ? '#ddd' : color + '60'}`,
        borderLeft: `3px solid ${event.is_completed ? '#ccc' : color}`,
        borderRadius: '4px', px: 0.75, py: 0.4,
        cursor: 'pointer', mb: 0.4,
        textDecoration: event.is_completed ? 'line-through' : 'none',
        '&:hover': { bgcolor: event.is_completed ? '#e8e8e8' : `${color}28`, boxShadow: 1 },
      }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden' }}>
        <Typography sx={{ fontSize: '0.7rem', lineHeight: 1, flexShrink: 0 }}>{icon}</Typography>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {event.title}
        </Typography>
      </Box>
      {(time || event.engagement_name || (event.attendees_detail?.length > 0)) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2, flexWrap: 'wrap' }}>
          {time && <Typography sx={{ fontSize: '0.62rem', opacity: 0.8 }}>{time}</Typography>}
          {event.engagement_name && (
            <Typography sx={{ fontSize: '0.62rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
              · {event.engagement_name}
            </Typography>
          )}
          {event.attendees_detail?.length > 0 && (
            <Typography sx={{ fontSize: '0.62rem', opacity: 0.75 }}>· 👤 {event.attendees_detail.length}</Typography>
          )}
          {event.is_completed && <Typography sx={{ fontSize: '0.62rem', color: '#27ae60' }}>✓</Typography>}
        </Box>
      )}
    </Box>
  );
}

function EngagementChip({ engagement, onClick }) {
  const s = ENG_STATUS[engagement.status] || ENG_STATUS.PLANNING;
  return (
    <Box onClick={(e) => { e.stopPropagation(); onClick(engagement); }}
      sx={{
        bgcolor: s.bg, color: s.text,
        border: `1px solid ${s.border}60`,
        borderLeft: `3px solid ${s.border}`,
        borderRadius: '4px', px: 0.75, py: 0.4,
        cursor: 'pointer', mb: 0.4,
        '&:hover': { opacity: 0.85, boxShadow: 1 },
      }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        📋 {engagement.name}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.2, alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 600, bgcolor: s.border + '20', color: s.text, px: 0.5, borderRadius: '2px' }}>
          {s.label}
        </Typography>
        {engagement.client_name && (
          <Typography sx={{ fontSize: '0.62rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {engagement.client_name}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function GrcAssessmentChip({ assessment, onClick, onDragStart, isDragging }) {
  const s = GRC_STATUS[assessment.status] || GRC_STATUS.DRAFT;
  return (
    <div
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(assessment.id));
        e.dataTransfer.effectAllowed = 'move';
        if (onDragStart) onDragStart(assessment);
      }}
      onClick={(e) => { e.stopPropagation(); onClick(assessment); }}
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}60`,
        borderLeft: `3px solid ${s.border}`,
        borderRadius: '4px',
        padding: '3px 6px',
        cursor: onDragStart ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        opacity: isDragging ? 0.4 : 1,
        marginBottom: 3,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{ fontSize: '0.72rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        🛡️ {assessment.title}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 2, alignItems: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, background: s.border + '20', color: s.text, padding: '0 4px', borderRadius: '2px' }}>
          GRC · {s.label}
        </span>
        {assessment.grc_consultant_name && (
          <span style={{ fontSize: '0.62rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {assessment.grc_consultant_name}
          </span>
        )}
      </div>
    </div>
  );
}

function GrcProjectChip({ project, onClick, onDragStart, isDragging }) {
  const s = GRC_PROJECT_STATUS[project.status] || GRC_PROJECT_STATUS.ACTIVE;
  return (
    <div
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', `grc-project:${project.id}`);
        e.dataTransfer.effectAllowed = 'move';
        if (onDragStart) onDragStart(project);
      }}
      onClick={(e) => { e.stopPropagation(); onClick(project); }}
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}60`,
        borderLeft: `3px solid ${s.border}`,
        borderRadius: '4px',
        padding: '3px 6px',
        cursor: onDragStart ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        opacity: isDragging ? 0.4 : 1,
        marginBottom: 3,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{ fontSize: '0.72rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        GRC Project · {project.title}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 2, alignItems: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, background: s.border + '20', color: s.text, padding: '0 4px', borderRadius: '2px' }}>
          {s.label}
        </span>
        {project.assessor_name && (
          <span style={{ fontSize: '0.62rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.assessor_name}
          </span>
        )}
      </div>
    </div>
  );
}

function TeamEngBlock({ engagement, onClick, onDragStart, isDragging }) {
  const s = ENG_STATUS[engagement.status] || ENG_STATUS.PLANNING;
  return (
    <Box
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(engagement.id));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(engagement);
      }}
      onClick={() => onClick(engagement)}
      sx={{
        bgcolor: s.bg, color: s.text,
        border: `1px solid ${s.border}80`,
        borderLeft: `3px solid ${s.border}`,
        borderRadius: '4px', px: 0.75, py: 0.4, mb: 0.4,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        '&:hover': { opacity: isDragging ? 0.4 : 0.85, boxShadow: 1 },
        '&:active': { cursor: 'grabbing' },
      }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        📋 {engagement.name}
      </Typography>
      <Typography sx={{ fontSize: '0.65rem', opacity: 0.8, pointerEvents: 'none' }}>{s.label}</Typography>
    </Box>
  );
}

function TeamEventBlock({ event, onClick, onDragStart, isDragging }) {
  const color = EVENT_COLORS[event.event_type] || '#7b1fa2';
  const icon  = EVENT_ICONS[event.event_type] || '📌';
  const time  = event.all_day ? null : event.start_date?.slice(11, 16);
  return (
    <Box
      draggable={!!onDragStart}
      onDragStart={(e) => {
        if (!onDragStart) return;
        e.dataTransfer.setData('text/plain', String(event.id));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(event);
      }}
      onClick={() => onClick(event)}
      sx={{
        bgcolor: `${color}28`,
        color,
        border: `1px solid ${color}80`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '4px', px: 0.75, py: 0.4, mb: 0.4,
        cursor: onDragStart ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        opacity: isDragging ? 0.4 : (event.is_completed ? 0.6 : 1),
        textDecoration: event.is_completed ? 'line-through' : 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        '&:hover': { bgcolor: `${color}40`, boxShadow: 1 },
        '&:active': { cursor: onDragStart ? 'grabbing' : 'pointer' },
      }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        {icon} {event.title}
      </Typography>
      {(time || event.comments_count > 0) && (
        <Box sx={{ display: 'flex', gap: 0.75, mt: 0.2, pointerEvents: 'none' }}>
          {time && <Typography sx={{ fontSize: '0.65rem', opacity: 0.8 }}>{time}</Typography>}
          {event.comments_count > 0 && <Typography sx={{ fontSize: '0.65rem', opacity: 0.8 }}>💬 {event.comments_count}</Typography>}
          {event.is_completed && <Typography sx={{ fontSize: '0.65rem', color: '#27ae60', fontWeight: 700 }}>✓ Done</Typography>}
        </Box>
      )}
    </Box>
  );
}

function TeamTaskBlock({ task, onClick, onDragStart, isDragging }) {
  const color = PRIORITY_COLORS[task.priority] || '#7f8c8d';
  return (
    <Box
      draggable={!!onDragStart}
      onDragStart={(e) => {
        if (!onDragStart) return;
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task);
      }}
      onClick={() => onClick(task)}
      sx={{
        bgcolor: `${color}22`,
        color,
        border: `1px solid ${color}70`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '4px', px: 0.75, py: 0.4, mb: 0.4,
        cursor: onDragStart ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        opacity: isDragging ? 0.4 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        '&:hover': { bgcolor: `${color}35`, boxShadow: 1 },
        '&:active': { cursor: onDragStart ? 'grabbing' : 'pointer' },
      }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        📋 {task.title}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.2, alignItems: 'center', pointerEvents: 'none' }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, bgcolor: `${color}30`, px: 0.5, borderRadius: '2px' }}>{task.priority}</Typography>
        <Typography sx={{ fontSize: '0.62rem', opacity: 0.75 }}>{task.status_display || task.status}</Typography>
      </Box>
    </Box>
  );
}

const BLANK_EVENT = { title: '', description: '', event_type: 'OTHER', start_date: '', end_date: '', all_day: false, location: '', is_client_visible: false, engagement: '', attendee_ids: [] };
const BLANK_TASK  = { title: '', description: '', priority: 'MEDIUM', status: 'TODO', due_date: '', assigned_to: '', engagement: '' };
const BLANK_REQ   = { title: '', notes: '', preferred_start: '', preferred_end: '', engagement: '' };

// ─── Date-shift helpers ───────────────────────────────────────────────────────
function shiftEngagementDates(eng, newStartDay) {
  const origStart = dayjs(eng.start_date);
  const origEnd   = dayjs(eng.end_date);

  if (eng.skip_weekends) {
    // Count inclusive working days in original range
    let workingDays = 0;
    let d = origStart;
    while (!d.isAfter(origEnd)) {
      if (d.day() !== 0 && d.day() !== 6) workingDays++;
      d = d.add(1, 'day');
    }
    // Walk forward from newStartDay for (workingDays - 1) additional working days
    let newEnd = newStartDay;
    let remaining = workingDays - 1;
    while (remaining > 0) {
      newEnd = newEnd.add(1, 'day');
      if (newEnd.day() !== 0 && newEnd.day() !== 6) remaining--;
    }
    return { new_start_date: newStartDay.format('YYYY-MM-DD'), new_end_date: newEnd.format('YYYY-MM-DD') };
  } else {
    const calDays = origEnd.diff(origStart, 'day');
    return {
      new_start_date: newStartDay.format('YYYY-MM-DD'),
      new_end_date: newStartDay.add(calDays, 'day').format('YYYY-MM-DD'),
    };
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Calendar() {
  const today    = dayjs();
  const theme    = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // JWT decode path uses user_id claim; direct login path uses id field
  const myUserId = Number(user?.id ?? user?.user_id ?? 0);

  // View — clients always get month view, others default to team
  const [viewMode, setViewMode] = useState(user?.role === 'CLIENT' ? 'month' : 'team');

  // Month view nav
  const [year,  setYear]  = useState(today.year());
  const [month, setMonth] = useState(today.month());

  // Team view nav
  const [weekStart, setWeekStart] = useState(today.startOf('week'));

  // Data
  const [events,          setEvents]          = useState([]);
  const [tasks,           setTasks]           = useState([]);
  const [requests,        setRequests]        = useState([]);
  const [engagements,     setEngagements]     = useState([]);
  const [grcAssessments,  setGrcAssessments]  = useState([]);
  const [grcProjects,     setGrcProjects]     = useState([]);
  const [members,         setMembers]         = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [searchQ,    setSearchQ]    = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('');
  const [mineOnly,   setMineOnly]   = useState(false);

  // Dialogs
  const [eventDlg,  setEventDlg]  = useState(false);
  const [taskDlg,   setTaskDlg]   = useState(false);
  const [reqDlg,    setReqDlg]    = useState(false);
  const [detailDlg, setDetailDlg] = useState(null);
  const [detailTab, setDetailTab] = useState(0);

  const [newEvent, setNewEvent] = useState(BLANK_EVENT);
  const [newTask,  setNewTask]  = useState(BLANK_TASK);
  const [newReq,   setNewReq]   = useState(BLANK_REQ);

  // Comments
  const [comments,     setComments]     = useState([]);
  const [commentText,  setCommentText]  = useState('');
  const [commentSaving, setCommentSaving] = useState(false);

  // Handover attachments
  const [attachments,    setAttachments]    = useState([]);
  const [attUploading,   setAttUploading]   = useState(false);

  // Drag-to-reassign
  const [dragEng,             setDragEng]             = useState(null);
  const [dragPoolEvent,       setDragPoolEvent]       = useState(null);
  const [dragTask,            setDragTask]            = useState(null);
  const [dragGridEvent,       setDragGridEvent]       = useState(null);
  const [dragGrcAssessment,   setDragGrcAssessment]   = useState(null);
  const [dragGrcProject,      setDragGrcProject]      = useState(null);
  const [dragSourceMember,    setDragSourceMember]    = useState(null);
  const [dragOverMember,   setDragOverMember]   = useState(null);
  const [dragOverDay,      setDragOverDay]      = useState(null); // 'YYYY-MM-DD'
  const [reassignDlg,      setReassignDlg]      = useState(null); // { engagement, targetMember }
  const [reassignMode,     setReassignMode]     = useState('replace'); // 'replace' | 'add'
  const [grcReassignDlg,   setGrcReassignDlg]  = useState(null); // { assessment, targetMember, sourceMember, targetDay }
  const [grcReassignMode,  setGrcReassignMode] = useState('replace'); // 'replace' | 'add'
  const [poolTab,          setPoolTab]          = useState(0); // 0=engagements, 1=tasks, 2=events
  const [draggingOverPool, setDraggingOverPool] = useState(false);
  const [snack,            setSnack]            = useState('');

  const dragOverRef  = useRef({ member: null, day: null });
  const dragGrcRef   = useRef(null); // mirrors dragGrcAssessment but always current (no stale closure)
  const dragGrcProjectRef = useRef(null);

  // Task view
  const [taskViewMode,   setTaskViewMode]   = useState('board');
  const [taskDetail,     setTaskDetail]     = useState(null);
  const [taskSearchQ,    setTaskSearchQ]    = useState('');
  const [taskPriorityF,  setTaskPriorityF]  = useState('');
  const [taskAssigneeF,  setTaskAssigneeF]  = useState('');
  const [taskEngF,       setTaskEngF]       = useState('');
  const [taskStatusF,    setTaskStatusF]    = useState('');
  const [kanbanDragTask, setKanbanDragTask] = useState(null);
  const [kanbanDragOver, setKanbanDragOver] = useState(null);
  const [editingColumn,  setEditingColumn]  = useState(null);
  const [columnLabels,   setColumnLabels]   = useState(() => {
    try {
      const saved = localStorage.getItem('ozireport_column_labels');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const colLabel = (value, fallback) => columnLabels[value] || fallback;

  const saveColumnLabel = (value, label) => {
    const next = { ...columnLabels, [value]: label };
    setColumnLabels(next);
    try { localStorage.setItem('ozireport_column_labels', JSON.stringify(next)); } catch {}
  };

  // Engagement popup
  const [engDlg,       setEngDlg]       = useState(null);
  const [engDlgMember, setEngDlgMember] = useState(null); // which member's row was clicked
  const [engNotes,     setEngNotes]     = useState('');
  const [engNotesTab,  setEngNotesTab]  = useState(0);


  const role     = user?.role || '';
  const isClient = role === 'CLIENT';
  const isAdmin  = role === 'ADMIN' || role === 'SUPERADMIN';

  const startOfMonth = dayjs(new Date(year, month, 1)).format('YYYY-MM-DD');
  const endOfMonth   = dayjs(new Date(year, month + 1, 0)).format('YYYY-MM-DD');

  const dispatchAssignment = () => window.dispatchEvent(new Event('ozireport_assignment'));

  const fetchEvents = useCallback(async () => {
    const startDate = viewMode === 'month' ? startOfMonth : weekStart.format('YYYY-MM-DD');
    const endDate   = viewMode === 'month' ? endOfMonth   : weekStart.add(6, 'day').format('YYYY-MM-DD');
    try {
      const res = await api.get(`/scheduling/events/?start=${startDate}&end=${endDate}`);
      setEvents(res.data.results || res.data);
    } catch (e) { console.error(e); }
  }, [startOfMonth, endOfMonth, viewMode, weekStart]);

  const fetchEngagements = useCallback(async () => {
    try {
      const res = await api.get('/engagements/');
      setEngagements(res.data.results || res.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchGrcAssessments = useCallback(async () => {
    try {
      const startDate = viewMode === 'month' ? startOfMonth : weekStart.format('YYYY-MM-DD');
      const endDate   = viewMode === 'month' ? endOfMonth   : weekStart.add(6, 'day').format('YYYY-MM-DD');
      const res = await api.get(`/assessments/list/calendar_events/?start=${startDate}&end=${endDate}`);
      setGrcAssessments(res.data || []);
    } catch (e) { console.error('GRC assessment fetch error', e); }
  }, [viewMode, startOfMonth, endOfMonth, weekStart]);

  const fetchGrcProjects = useCallback(async () => {
    try {
      const res = await api.get('/grc/projects/');
      setGrcProjects(res.data.results || res.data);
    } catch (e) { console.error('GRC project fetch error', e); }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/scheduling/tasks/');
      setTasks(res.data.results || res.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/scheduling/requests/');
      setRequests(res.data.results || res.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchEvents(), fetchEngagements(), fetchGrcAssessments(), fetchGrcProjects()]);
      if (!isClient) {
        await Promise.all([fetchTasks(), fetchRequests()]);
        try {
          const mRes = await api.get('/auth/users/');
          setMembers((mRes.data.results || mRes.data).filter(m => m.role !== 'CLIENT'));
        } catch {}
      } else {
        await fetchRequests();
      }
    } catch (e) { console.error('Calendar fetch error', e); }
    setLoading(false);
  }, [fetchEvents, fetchEngagements, fetchGrcAssessments, fetchGrcProjects, fetchTasks, fetchRequests, isClient]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filter logic ─────────────────────────────────────────────────────────
  // Events with no engagement and no attendees sit in the pool, not the calendar grid
  const unassignedEvents = useMemo(() =>
    events.filter(ev => !ev.engagement && (!ev.attendees_detail || ev.attendees_detail.length === 0)),
    [events]
  );

  const filteredEvents = useMemo(() => events.filter(ev => {
    // Keep off the calendar grid if unlinked — they live in the pool instead
    if (!ev.engagement && (!ev.attendees_detail || ev.attendees_detail.length === 0)) return false;
    if (searchQ && !ev.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filterType && ev.event_type !== filterType) return false;
    if (filterUser) {
      const uid = parseInt(filterUser);
      const isAtt = ev.attendees_detail?.some(a => sameId(a.id, uid)) || sameId(ev.created_by, uid);
      if (!isAtt) return false;
    }
    if (mineOnly) {
      const isAtt = ev.attendees_detail?.some(a => sameId(a.id, myUserId)) || sameId(ev.created_by, myUserId);
      if (!isAtt) return false;
    }
    return true;
  }), [events, searchQ, filterType, filterUser, mineOnly, myUserId]);

  const filteredEngagements = useMemo(() => engagements.filter(eng => {
    if (searchQ && !eng.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filterUser) {
      const uid = parseInt(filterUser);
      const inTeam = sameId(eng.lead_pentester, uid) || sameId(eng.project_manager, uid) ||
                     hasId(eng.team_members, uid);
      if (!inTeam) return false;
    }
    if (mineOnly) {
      const inTeam = sameId(eng.lead_pentester, myUserId) || sameId(eng.project_manager, myUserId) ||
                     hasId(eng.team_members, myUserId);
      if (!inTeam) return false;
    }
    return true;
  }), [engagements, searchQ, filterUser, mineOnly, myUserId]);

  // ── Month view helpers ────────────────────────────────────────────────────
  const eventsOnDay = (d) => {
    if (!d) return [];
    const ds = d.format('YYYY-MM-DD');
    return filteredEvents.filter(ev => {
      const s = ev.start_date?.slice(0, 10);
      const e = ev.end_date?.slice(0, 10);
      return ds >= s && ds <= e;
    });
  };

  const engagementsOnDay = (d) => {
    if (!d) return [];
    const ds  = d.format('YYYY-MM-DD');
    const dow = d.day(); // 0=Sun, 6=Sat
    return filteredEngagements.filter(eng => {
      if (eng.skip_weekends && (dow === 0 || dow === 6)) return false;
      return eng.start_date && eng.end_date && ds >= eng.start_date && ds <= eng.end_date;
    });
  };

  const grcAssessmentsOnDay = (d) => {
    if (!d) return [];
    const ds = d.format('YYYY-MM-DD');
    return grcAssessments.filter(a => a.start_date && a.end_date && ds >= a.start_date && ds <= a.end_date);
  };

  const grcProjectsOnDay = (d) => {
    if (!d) return [];
    const ds = d.format('YYYY-MM-DD');
    return grcProjects.filter(p => p.assessor && p.target_date === ds);
  };

  // ── Team view helpers ─────────────────────────────────────────────────────
  const engagementsForMemberDay = (member, day) => {
    const ds  = day.format('YYYY-MM-DD');
    const dow = day.day();
    return filteredEngagements.filter(eng => {
      if (eng.skip_weekends && (dow === 0 || dow === 6)) return false;
      const inTeam = sameId(eng.lead_pentester, member.id) || sameId(eng.project_manager, member.id) ||
                     hasId(eng.team_members, member.id);
      return inTeam && eng.start_date && eng.end_date && ds >= eng.start_date && ds <= eng.end_date;
    });
  };

  const eventsForMemberDay = (member, day) => {
    const ds = day.format('YYYY-MM-DD');
    return filteredEvents.filter(ev => {
      // Only show in team rows based on attendees — not created_by.
      // Events show in pool if unlinked; created_by alone isn't enough to put them on someone's row.
      const isAtt = ev.attendees_detail?.some(a => sameId(a.id, member.id));
      const s = ev.start_date?.slice(0, 10);
      const e = ev.end_date?.slice(0, 10);
      return isAtt && s && e && ds >= s && ds <= e;
    });
  };

  const tasksForMemberDay = (member, day) => {
    const ds = day.format('YYYY-MM-DD');
    return tasks.filter(t =>
      sameId(t.assigned_to, member.id) && t.due_date === ds && t.status !== 'DONE'
    );
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
  const goToday   = () => { setYear(today.year()); setMonth(today.month()); setWeekStart(today.startOf('week')); };

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleCreateEvent = async () => {
    try {
      await api.post('/scheduling/events/', { ...newEvent, engagement: newEvent.engagement || null });
      setEventDlg(false); setNewEvent(BLANK_EVENT); fetchEvents();
    } catch (e) { console.error(e); }
  };

  const handleCreateTask = async () => {
    try {
      await api.post('/scheduling/tasks/', {
        title:       newTask.title,
        description: newTask.description || '',
        priority:    newTask.priority    || 'MEDIUM',
        status:      newTask.status      || 'TODO',
        due_date:    newTask.due_date    || null,
        assigned_to: newTask.assigned_to || null,
        engagement:  newTask.engagement  || null,
      });
      setTaskDlg(false);
      setNewTask(BLANK_TASK);
      fetchTasks();
    } catch (e) {
      console.error(e);
      setSnack('Failed to create task — check all fields and try again.');
    }
  };

  const handleCreateReq = async () => {
    try {
      await api.post('/scheduling/requests/', { ...newReq, engagement: newReq.engagement || null });
      setReqDlg(false); setNewReq(BLANK_REQ); fetchRequests();
    } catch (e) { console.error(e); }
  };

const handleDeleteEvent = async (id) => {
    try { await api.delete(`/scheduling/events/${id}/`); setDetailDlg(null); fetchEvents(); } catch (e) { console.error(e); }
  };

  const handleToggleComplete = async (event) => {
    const toggled = !event.is_completed;
    setDetailDlg(prev => prev ? { ...prev, is_completed: toggled } : prev);
    setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, is_completed: toggled } : ev));
    try {
      const res = await api.post(`/scheduling/events/${event.id}/complete/`);
      setDetailDlg(res.data);
    } catch (e) {
      console.error(e);
      setDetailDlg(event);
      setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, is_completed: event.is_completed } : ev));
    }
  };

  const handleApproveReq  = async (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    try { await api.post(`/scheduling/requests/${id}/approve/`); } catch { fetchRequests(); }
  };
  const handleRejectReq   = async (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
    try { await api.post(`/scheduling/requests/${id}/reject/`); } catch { fetchRequests(); }
  };
  const handleCompleteTask = async (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'DONE' } : t));
    try { await api.post(`/scheduling/tasks/${id}/complete/`); } catch { fetchTasks(); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/scheduling/events/sync_engagements/');
      fetchEvents();
      alert(`Synced ${res.data.created} new events from engagements.`);
    } catch (e) { console.error(e); }
    setSyncing(false);
  };

  const handleReassign = async () => {
    if (!reassignDlg) return;
    const { engagement, targetMember, sourceMember, targetDay } = reassignDlg;
    setEngagements(prev => prev.map(e => {
      if (e.id !== engagement.id) return e;
      const updated = { ...e };
      if (targetDay) {
        const { new_start_date, new_end_date } = shiftEngagementDates(engagement, targetDay);
        updated.start_date = new_start_date; updated.end_date = new_end_date;
      }
      if (sourceMember) {
        if (sameId(updated.lead_pentester, sourceMember.id)) {
          updated.lead_pentester = targetMember.id;
          // Mirror backend: remove source AND target from team_members (target is now lead, not a member)
          updated.team_members = (updated.team_members || []).filter(
            id => !sameId(id, sourceMember.id) && !sameId(id, targetMember.id)
          );
        } else if (sameId(updated.project_manager, sourceMember.id)) {
          updated.project_manager = targetMember.id;
        } else {
          updated.team_members = hasId(updated.team_members, targetMember.id)
            ? withoutId(updated.team_members, sourceMember.id)
            : [...withoutId(updated.team_members, sourceMember.id), targetMember.id];
        }
      } else {
        updated.lead_pentester = targetMember.id;
        // Remove target from team_members — they're now the lead
        updated.team_members = withoutId(updated.team_members, targetMember.id);
      }
      return updated;
    }));
    setSnack(`"${engagement.name}" moved to ${targetMember.first_name} ${targetMember.last_name}`);
    setReassignDlg(null); setDragEng(null); setDragSourceMember(null); setDragOverMember(null);
    dragOverRef.current = { member: null, day: null };
    try {
      const payload = { source_id: sourceMember?.id, target_id: targetMember.id };
      if (targetDay) Object.assign(payload, shiftEngagementDates(engagement, targetDay));
      const res = await api.post(`/engagements/${engagement.id}/reassign/`, payload);
      setEngagements(prev => prev.map(e => e.id !== engagement.id ? e : res.data));
      dispatchAssignment();
    } catch (e) { console.error(e); setSnack('Failed to reassign engagement.'); fetchEngagements(); }
  };

  const handleDateOnlyChange = async (eng, targetDay) => {
    const { new_start_date, new_end_date } = shiftEngagementDates(eng, targetDay);
    setEngagements(prev => prev.map(e => e.id === eng.id ? { ...e, start_date: new_start_date, end_date: new_end_date } : e));
    setSnack(`"${eng.name}" rescheduled to ${new_start_date}`);
    setDragEng(null); setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null);
    dragOverRef.current = { member: null, day: null };
    try {
      await api.patch(`/engagements/${eng.id}/`, { start_date: new_start_date, end_date: new_end_date });
      dispatchAssignment();
    } catch (e) { console.error(e); setSnack('Failed to reschedule engagement.'); fetchEngagements(); }
  };

  const handleAssignEventFromPool = async (ev, member, targetDay) => {
    const origStart = dayjs(ev.start_date);
    const durationMin = dayjs(ev.end_date).diff(origStart, 'minute');
    const newStart = targetDay ? targetDay.hour(origStart.hour()).minute(origStart.minute()).second(0) : origStart;
    const newEnd   = newStart.add(durationMin, 'minute');
    setEvents(prev => prev.map(e => e.id !== ev.id ? e : {
      ...e, attendees_detail: [member],
      start_date: newStart.format('YYYY-MM-DDTHH:mm:ss'),
      end_date:   newEnd.format('YYYY-MM-DDTHH:mm:ss'),
    }));
    setSnack(`Event assigned to ${member.first_name} ${member.last_name}`);
    setDragPoolEvent(null); setDragOverMember(null); setDragOverDay(null);
    dragOverRef.current = { member: null, day: null };
    try {
      await api.patch(`/scheduling/events/${ev.id}/`, {
        attendee_ids: [member.id],
        start_date: newStart.format('YYYY-MM-DDTHH:mm:ss'),
        end_date:   newEnd.format('YYYY-MM-DDTHH:mm:ss'),
      });
      dispatchAssignment();
    } catch (e) { console.error(e); setSnack('Failed to assign event.'); fetchEvents(); }
  };

  const handleReturnToPool = async () => {
    const clearDrag = () => {
      dragOverRef.current = { member: null, day: null };
      dragGrcRef.current = null;
      dragGrcProjectRef.current = null;
      setDragEng(null); setDragTask(null); setDragGridEvent(null); setDragGrcAssessment(null); setDragGrcProject(null);
      setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null);
      setDraggingOverPool(false);
    };
    if (dragGrcProject || dragGrcProjectRef.current) {
      const p = dragGrcProject || dragGrcProjectRef.current;
      setGrcProjects(prev => prev.map(project => project.id !== p.id ? project : {
        ...project, assessor: null, assessor_name: null,
      }));
      setSnack(`"${p.title}" returned to unassigned pool`);
      clearDrag();
      try {
        const res = await api.patch(`/grc/projects/${p.id}/`, { assessor: null });
        setGrcProjects(prev => prev.map(project => project.id !== p.id ? project : res.data));
      }
      catch (e) { console.error(e); setSnack('Failed.'); fetchGrcProjects(); }
    } else if (dragGrcAssessment || dragGrcRef.current) {
      const a = dragGrcAssessment || dragGrcRef.current;
      setGrcAssessments(prev => prev.map(g => g.id !== a.id ? g : {
        ...g, grc_consultant_id: null, grc_consultant_name: null,
      }));
      setSnack(`"${a.title}" returned to unassigned pool`);
      clearDrag();
      try { await api.patch(`/assessments/list/${a.id}/`, { grc_consultant: null }); }
      catch (e) { console.error(e); setSnack('Failed.'); fetchGrcAssessments(); }
    } else if (dragEng && dragSourceMember) {
      const { id: engId, name } = dragEng; const srcId = dragSourceMember.id;
      setEngagements(prev => prev.map(e => e.id !== engId ? e : {
        ...e,
        lead_pentester: sameId(e.lead_pentester, srcId) ? null : e.lead_pentester,
        project_manager: sameId(e.project_manager, srcId) ? null : e.project_manager,
        team_members: withoutId(e.team_members, srcId),
      }));
      setSnack(`"${name}" returned to unassigned pool`);
      clearDrag();
      try {
        const res = await api.post(`/engagements/${engId}/remove_member/`, { member_id: srcId });
        setEngagements(prev => prev.map(e => e.id !== engId ? e : res.data));
        dispatchAssignment();
      }
      catch (e) { console.error(e); setSnack('Failed.'); fetchEngagements(); }
    } else if (dragTask && dragSourceMember) {
      const taskId = dragTask.id;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: null } : t));
      setSnack('Task returned to unassigned pool');
      clearDrag();
      try { await api.patch(`/scheduling/tasks/${taskId}/`, { assigned_to: null }); dispatchAssignment(); }
      catch (e) { console.error(e); setSnack('Failed.'); fetchTasks(); }
    } else if (dragGridEvent && dragSourceMember) {
      const srcId = dragSourceMember.id; const evId = dragGridEvent.id;
      const remainingIds = (dragGridEvent.attendees_detail || []).map(a => a.id).filter(id => !sameId(id, srcId));
      setEvents(prev => prev.map(ev => ev.id !== evId ? ev : {
        ...ev, attendees_detail: (ev.attendees_detail || []).filter(a => !sameId(a.id, srcId)),
      }));
      setSnack('Event returned to unassigned pool');
      clearDrag();
      try { await api.patch(`/scheduling/events/${evId}/`, { attendee_ids: remainingIds }); dispatchAssignment(); }
      catch (e) { console.error(e); setSnack('Failed.'); fetchEvents(); }
    }
  };

  const handleAssignTaskFromPool = async (task, member, targetDay) => {
    const update = { assigned_to: member.id, ...(targetDay ? { due_date: targetDay.format('YYYY-MM-DD') } : {}) };
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...update } : t));
    setSnack(`Task assigned to ${member.first_name} ${member.last_name}`);
    setDragTask(null); setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null);
    dragOverRef.current = { member: null, day: null };
    try { await api.patch(`/scheduling/tasks/${task.id}/`, update); dispatchAssignment(); }
    catch (e) { console.error(e); setSnack('Failed to assign task.'); fetchTasks(); }
  };

  const handleAssignGrcFromPool = async (assessment, member, targetDay) => {
    let dateUpdate = {};
    if (targetDay) {
      const newStart = targetDay.format('YYYY-MM-DD');
      if (assessment.start_date && assessment.end_date) {
        const duration = dayjs(assessment.end_date).diff(dayjs(assessment.start_date), 'day');
        dateUpdate = { start_date: newStart, end_date: targetDay.add(duration, 'day').format('YYYY-MM-DD') };
      } else {
        dateUpdate = { start_date: newStart, end_date: newStart };
      }
    }
    const patchData = { grc_consultant: member.id, ...dateUpdate };
    setGrcAssessments(prev => prev.map(a => a.id !== assessment.id ? a : {
      ...a,
      grc_consultant_id: member.id,
      grc_consultant_name: `${member.first_name} ${member.last_name}`,
      ...dateUpdate,
    }));
    setSnack(`"${assessment.title}" assigned to ${member.first_name} ${member.last_name}`);
    setDragGrcAssessment(null); setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null);
    dragOverRef.current = { member: null, day: null };
    dragGrcRef.current = null;
    try { await api.patch(`/assessments/list/${assessment.id}/`, patchData); }
    catch (e) { console.error(e); setSnack('Failed to assign GRC assessment.'); fetchGrcAssessments(); }
  };

  const handleAssignGrcProjectFromPool = async (project, member, targetDay) => {
    const dateUpdate = targetDay ? { target_date: targetDay.format('YYYY-MM-DD') } : {};
    const patchData = { assessor: member.id, ...dateUpdate };
    setGrcProjects(prev => prev.map(p => p.id !== project.id ? p : {
      ...p,
      assessor: member.id,
      assessor_name: `${member.first_name} ${member.last_name}`,
      ...dateUpdate,
    }));
    setSnack(`"${project.title}" assigned to ${member.first_name} ${member.last_name}`);
    setDragGrcProject(null); setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null);
    dragOverRef.current = { member: null, day: null };
    dragGrcProjectRef.current = null;
    try {
      const res = await api.patch(`/grc/projects/${project.id}/`, patchData);
      setGrcProjects(prev => prev.map(p => p.id !== project.id ? p : res.data));
    }
    catch (e) { console.error(e); setSnack('Failed to assign GRC project.'); fetchGrcProjects(); }
  };

  const handleGrcReassign = async () => {
    if (!grcReassignDlg) return;
    const { assessment, targetMember, targetDay } = grcReassignDlg;
    const isReplace = grcReassignMode === 'replace';
    if (isReplace) {
      await handleAssignGrcFromPool(assessment, targetMember, targetDay);
    } else {
      // Add as assessor, keep existing grc_consultant
      setGrcAssessments(prev => prev.map(a => a.id !== assessment.id ? a : {
        ...a, assessor: targetMember.id, assessor_name: `${targetMember.first_name} ${targetMember.last_name}`,
      }));
      setSnack(`${targetMember.first_name} ${targetMember.last_name} added as assessor on "${assessment.title}"`);
      try { await api.patch(`/assessments/list/${assessment.id}/`, { assessor: targetMember.id }); }
      catch (e) { console.error(e); setSnack('Failed.'); fetchGrcAssessments(); }
    }
    setGrcReassignDlg(null);
    setGrcReassignMode('replace');
    setDragGrcAssessment(null);
    dragGrcRef.current = null;
    setDragSourceMember(null);
  };

  const handleDragTaskInGrid = async (task, targetMember, targetDay) => {
    const update = { assigned_to: targetMember.id, ...(targetDay ? { due_date: targetDay.format('YYYY-MM-DD') } : {}) };
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...update } : t));
    setSnack(`Task moved to ${targetMember.first_name} ${targetMember.last_name}`);
    setDragTask(null); setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null);
    dragOverRef.current = { member: null, day: null };
    try { await api.patch(`/scheduling/tasks/${task.id}/`, update); dispatchAssignment(); }
    catch (e) { console.error(e); setSnack('Failed to move task.'); fetchTasks(); }
  };

  const handleDragEventInGrid = async (event, targetMember, targetDay) => {
    const origStart = dayjs(event.start_date);
    const durationMin = dayjs(event.end_date).diff(origStart, 'minute');
    const newStart = targetDay ? targetDay.hour(origStart.hour()).minute(origStart.minute()).second(0) : origStart;
    const newEnd   = newStart.add(durationMin, 'minute');
    const existingIds = (event.attendees_detail || []).map(a => a.id);
    const srcMember = dragSourceMember;
    const withoutSource = srcMember ? withoutId(existingIds, srcMember.id) : existingIds;
    const newIds = hasId(withoutSource, targetMember.id) ? withoutSource : [...withoutSource, targetMember.id];
    setEvents(prev => prev.map(ev => ev.id !== event.id ? ev : {
      ...ev,
      attendees_detail: [
        ...(ev.attendees_detail || []).filter(a => !sameId(a.id, srcMember?.id)),
        ...(ev.attendees_detail?.some(a => sameId(a.id, targetMember.id)) ? [] : [targetMember]),
      ],
      start_date: newStart.format('YYYY-MM-DDTHH:mm:ss'),
      end_date:   newEnd.format('YYYY-MM-DDTHH:mm:ss'),
    }));
    setSnack(`Event assigned to ${targetMember.first_name} ${targetMember.last_name}`);
    setDragGridEvent(null); setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null);
    dragOverRef.current = { member: null, day: null };
    try {
      await api.patch(`/scheduling/events/${event.id}/`, {
        attendee_ids: newIds,
        start_date: newStart.format('YYYY-MM-DDTHH:mm:ss'),
        end_date:   newEnd.format('YYYY-MM-DDTHH:mm:ss'),
      });
      dispatchAssignment();
    } catch (e) { console.error(e); setSnack('Failed to move event.'); fetchEvents(); }
  };

  const handleAddToTeam = async () => {
    if (!reassignDlg) return;
    const { engagement, targetMember, targetDay } = reassignDlg;
    setEngagements(prev => prev.map(e => {
      if (e.id !== engagement.id) return e;
      const updated = { ...e };
      if (targetDay) {
        const { new_start_date, new_end_date } = shiftEngagementDates(engagement, targetDay);
        updated.start_date = new_start_date; updated.end_date = new_end_date;
      }
      if (!hasId(updated.team_members, targetMember.id))
        updated.team_members = [...(updated.team_members || []), targetMember.id];
      return updated;
    }));
    setSnack(`${targetMember.first_name} ${targetMember.last_name} added to team for "${engagement.name}"`);
    setReassignDlg(null); setDragEng(null); setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null);
    dragOverRef.current = { member: null, day: null };
    try {
      const payload = { add_to_team: true, target_id: targetMember.id };
      if (targetDay) Object.assign(payload, shiftEngagementDates(engagement, targetDay));
      const res = await api.post(`/engagements/${engagement.id}/reassign/`, payload);
      setEngagements(prev => prev.map(e => e.id !== engagement.id ? e : res.data));
      dispatchAssignment();
    } catch (e) { console.error(e); setSnack('Failed to add to team.'); fetchEngagements(); }
  };

  const handleAssignFromPool = async (eng, member, targetDay) => {
    let dates = {};
    if (targetDay) {
      if (eng.start_date && eng.end_date) {
        dates = shiftEngagementDates(eng, targetDay);
      } else {
        const d = targetDay.format('YYYY-MM-DD');
        dates = { new_start_date: d, new_end_date: d };
      }
    }
    setEngagements(prev => prev.map(e => e.id !== eng.id ? e : {
      ...e, lead_pentester: member.id,
      ...(dates.new_start_date ? { start_date: dates.new_start_date, end_date: dates.new_end_date } : {}),
    }));
    setSnack(`"${eng.name}" assigned to ${member.first_name} ${member.last_name}`);
    setDragEng(null); setDragSourceMember(null); setDragOverMember(null);
    dragOverRef.current = { member: null, day: null };
    try {
      const payload = { target_id: member.id };
      if (targetDay) Object.assign(payload, dates);
      const res = await api.post(`/engagements/${eng.id}/reassign/`, payload);
      setEngagements(prev => prev.map(e => e.id !== eng.id ? e : res.data));
      dispatchAssignment();
    } catch (e) { console.error(e); setSnack('Failed to assign engagement.'); fetchEngagements(); }
  };

  const handleRemoveFromEngagement = async (eng, member) => {
    if (!eng || !member) return;
    setEngagements(prev => prev.map(e => e.id !== eng.id ? e : {
      ...e,
      lead_pentester: sameId(e.lead_pentester, member.id) ? null : e.lead_pentester,
      project_manager: sameId(e.project_manager, member.id) ? null : e.project_manager,
      team_members: withoutId(e.team_members, member.id),
    }));
    setSnack(`${member.first_name} ${member.last_name} unassigned from "${eng.name}"`);
    setEngDlg(null); setEngDlgMember(null);
    try {
      const res = await api.post(`/engagements/${eng.id}/remove_member/`, { member_id: member.id });
      setEngagements(prev => prev.map(e => e.id !== eng.id ? e : res.data));
      dispatchAssignment();
    } catch (e) { console.error(e); setSnack('Failed to unassign from engagement.'); fetchEngagements(); }
  };

  const openDetail = async (event) => {
    setDetailDlg(event);
    setDetailTab(0);
    setCommentText('');
    setAttachments([]);
    try {
      const [cRes, aRes] = await Promise.all([
        api.get(`/scheduling/events/${event.id}/comments/`),
        api.get(`/scheduling/events/${event.id}/attachments/`),
      ]);
      setComments(cRes.data);
      setAttachments(aRes.data);
    } catch { setComments([]); setAttachments([]); }
  };

  const openEngDetail = async (eng, member = null) => {
    setEngDlg(eng);
    setEngDlgMember(member);
    setEngNotesTab(0);
    setEngNotes(eng.description || '');
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !detailDlg) return;
    setCommentSaving(true);
    try {
      const res = await api.post(`/scheduling/events/${detailDlg.id}/comments/`, { text: commentText });
      setComments(c => [...c, res.data]);
      setCommentText('');
      fetchEvents();
    } catch (e) { console.error(e); }
    setCommentSaving(false);
  };

  const handleSaveHandover = async () => {
    if (!detailDlg) return;
    try {
      await api.patch(`/scheduling/events/${detailDlg.id}/`, { handover_notes: detailDlg.handover_notes });
      fetchEvents();
    } catch (e) { console.error(e); }
  };

  const handleUpdateTask = async (taskId, patch) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
    if (taskDetail?.id === taskId) setTaskDetail(prev => prev ? { ...prev, ...patch } : prev);
    try { await api.patch(`/scheduling/tasks/${taskId}/`, patch); }
    catch (e) { console.error(e); fetchTasks(); }
  };

  const handleDeleteTask = async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setTaskDetail(null);
    try { await api.delete(`/scheduling/tasks/${taskId}/`); }
    catch (e) { console.error(e); fetchTasks(); }
  };

  const handleUploadAttachment = async (file) => {
    if (!detailDlg || !file) return;
    setAttUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/scheduling/events/${detailDlg.id}/attachments/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments(prev => [...prev, res.data]);
    } catch (e) { console.error(e); }
    setAttUploading(false);
  };

  const handleDeleteAttachment = async (attId) => {
    if (!detailDlg) return;
    try {
      await api.delete(`/scheduling/events/${detailDlg.id}/attachments/${attId}/`);
      setAttachments(prev => prev.filter(a => a.id !== attId));
    } catch (e) { console.error(e); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const unassignedEngagements = useMemo(() =>
    engagements.filter(eng => !eng.lead_pentester),
    [engagements]
  );

  const unassignedTasks = useMemo(() =>
    tasks.filter(t => !t.assigned_to && t.status !== 'DONE'),
    [tasks]
  );

  const unassignedGrcAssessments = useMemo(() =>
    grcAssessments.filter(a => !getGrcConsultantId(a)),
    [grcAssessments]
  );

  const unassignedGrcProjects = useMemo(() =>
    grcProjects.filter(p => !p.assessor),
    [grcProjects]
  );

  // Projected date range shown as ghost-highlight when dragging
  const projectedRange = useMemo(() => {
    if (!dragEng || !dragOverDay || !dragOverMember) return null;
    return shiftEngagementDates(dragEng, dayjs(dragOverDay));
  }, [dragEng, dragOverDay, dragOverMember]);

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const activeTasks     = tasks.filter(t => t.status !== 'DONE');
  const upcomingEvents  = filteredEvents
    .filter(ev => ev.start_date?.slice(0, 10) >= today.format('YYYY-MM-DD'))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 8);

  const filteredTasksForView = useMemo(() => tasks.filter(t => {
    if (mineOnly      && !sameId(t.assigned_to, myUserId)) return false;
    if (taskSearchQ   && !t.title.toLowerCase().includes(taskSearchQ.toLowerCase())) return false;
    if (taskPriorityF && t.priority !== taskPriorityF) return false;
    if (taskAssigneeF && Number(t.assigned_to) !== parseInt(taskAssigneeF)) return false;
    if (taskEngF      && String(t.engagement) !== taskEngF) return false;
    if (taskStatusF   && t.status !== taskStatusF) return false;
    return true;
  }), [tasks, mineOnly, taskSearchQ, taskPriorityF, taskAssigneeF, taskEngF, taskStatusF, myUserId]);

  const taskOverdueCount = useMemo(() => {
    const base = mineOnly ? tasks.filter(t => sameId(t.assigned_to, myUserId)) : tasks;
    return base.filter(t => t.due_date && t.due_date < today.format('YYYY-MM-DD') && t.status !== 'DONE').length;
  }, [tasks, mineOnly, myUserId, today]);

  const cells     = buildCalendarGrid(year, month);
  const monthLabel = dayjs(new Date(year, month, 1)).format('MMMM YYYY');
  const DAYS      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const wDays     = useMemo(() => weekDays(weekStart), [weekStart]);

  const displayMembers = useMemo(() => {
    if (filterUser) return members.filter(m => sameId(m.id, parseInt(filterUser)));
    if (mineOnly)   return members.filter(m => sameId(m.id, myUserId));
    return members;
  }, [filterUser, mineOnly, members, myUserId]);

  const memberDayData = useMemo(() => {
    const map = {};
    for (const member of displayMembers) {
      for (const day of wDays) {
        const ds  = day.format('YYYY-MM-DD');
        const dow = day.day();
        map[`${member.id}:${ds}`] = {
          engs: filteredEngagements.filter(eng => {
            if (eng.skip_weekends && (dow === 0 || dow === 6)) return false;
            const inTeam = sameId(eng.lead_pentester, member.id) || sameId(eng.project_manager, member.id) ||
                           hasId(eng.team_members, member.id);
            return inTeam && eng.start_date && eng.end_date && ds >= eng.start_date && ds <= eng.end_date;
          }),
          evs: filteredEvents.filter(ev => {
            const isAtt = ev.attendees_detail?.some(a => sameId(a.id, member.id));
            const s = ev.start_date?.slice(0, 10);
            const e = ev.end_date?.slice(0, 10);
            return isAtt && s && e && ds >= s && ds <= e;
          }),
          tasks: tasks.filter(t =>
            sameId(t.assigned_to, member.id) && t.due_date === ds && t.status !== 'DONE'
          ),
          grcs: grcAssessments.filter(a =>
            sameId(getGrcConsultantId(a), member.id) &&
            a.start_date && a.end_date && ds >= a.start_date && ds <= a.end_date
          ),
          grcProjects: grcProjects.filter(p =>
            sameId(p.assessor, member.id) && p.target_date === ds
          ),
        };
      }
    }
    return map;
  }, [filteredEngagements, filteredEvents, tasks, grcAssessments, grcProjects, displayMembers, wDays]);

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Calendar</Typography>
          <Typography variant="body2" color="text.secondary">Engagements, events, tasks and team schedules</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View switcher — hidden for clients */}
          {!isClient && (
            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
              <ToggleButton value="month"><Tooltip title="Month view"><CalendarViewMonth fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="team"><Tooltip title="Team view"><People fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="tasks"><Tooltip title="Task board"><TaskIcon fontSize="small" /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
          )}
          {isAdmin && (
            <Button variant="outlined" startIcon={<Sync />} onClick={handleSync} disabled={syncing} size="small">
              {syncing ? 'Syncing…' : 'Sync Events'}
            </Button>
          )}
          {isClient ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setReqDlg(true)} size="small" sx={{ bgcolor: theme.palette.primary.main }}>
              Request Time Slot
            </Button>
          ) : (
            <>
              <Button variant="outlined" startIcon={<Add />} onClick={() => setTaskDlg(true)} size="small">New Task</Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => setEventDlg(true)} size="small" sx={{ bgcolor: theme.palette.primary.main }}>
                New Event
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* ── Filter bar ── */}
      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Search events & engagements…" value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
          {!isClient && (
            <TextField size="small" select value={filterUser} onChange={e => setFilterUser(e.target.value)} label="Team member" sx={{ minWidth: 180 }}>
              <MenuItem value="">All team members</MenuItem>
              {members.map(m => (
                <MenuItem key={m.id} value={m.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 20, height: 20, fontSize: '0.6rem', bgcolor: theme.palette.primary.main }}>
                      {m.first_name?.[0]}{m.last_name?.[0]}
                    </Avatar>
                    {m.first_name} {m.last_name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField size="small" select value={filterType} onChange={e => setFilterType(e.target.value)} label="Event type" sx={{ minWidth: 160 }}>
            <MenuItem value="">All types</MenuItem>
            {EVENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          {!isClient && (
            <FormControlLabel
              control={<Switch size="small" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />}
              label={<Typography variant="body2">Mine only</Typography>}
            />
          )}
          {(searchQ || filterUser || filterType || mineOnly) && (
            <Button size="small" onClick={() => { setSearchQ(''); setFilterUser(''); setFilterType(''); setMineOnly(false); }}>
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {isAdmin && pendingRequests.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {pendingRequests.length} pending time-slot request{pendingRequests.length > 1 ? 's' : ''} awaiting review.
        </Alert>
      )}

      {/* ── MONTH VIEW ── */}
      {viewMode === 'month' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
            <IconButton onClick={prevMonth} size="small"><ChevronLeft /></IconButton>
            <Typography variant="h6" fontWeight={600} sx={{ flex: 1, textAlign: 'center' }}>{monthLabel}</Typography>
            <Button size="small" onClick={goToday} sx={{ minWidth: 56 }}>Today</Button>
            <IconButton onClick={nextMonth} size="small"><ChevronRight /></IconButton>
          </Box>

          {/* Status legend */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
            {Object.entries(ENG_STATUS).slice(0, 4).map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: v.bg, border: `1px solid ${v.border}` }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>{v.label}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#24483E' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>Event</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: GRC_STATUS.DRAFT.bg, border: `1px solid ${GRC_STATUS.DRAFT.border}` }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>GRC Assessment</Typography>
            </Box>
          </Box>

          {loading && <LinearProgress sx={{ mb: 1 }} />}

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', bgcolor: 'divider', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            {DAYS.map(d => (
              <Box key={d} sx={{ bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', py: 0.75, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{d}</Typography>
              </Box>
            ))}
            {cells.map((cell, i) => {
              const isToday   = cell && cell.isSame(today, 'day');
              const isWeekend = cell && (cell.day() === 0 || cell.day() === 6);
              const dayEvs    = eventsOnDay(cell);
              const dayEngs   = engagementsOnDay(cell);
              const dayGrcs   = grcAssessmentsOnDay(cell);
              const dayGrcProjects = grcProjectsOnDay(cell);
              const total     = dayEvs.length + dayEngs.length + dayGrcs.length + dayGrcProjects.length;
              const visible   = 4;
              return (
                <Box key={i}
                  onClick={() => {
                    if (!cell || isClient) return;
                    const ds = cell.format('YYYY-MM-DD');
                    setNewEvent(e => ({ ...e, start_date: `${ds}T09:00`, end_date: `${ds}T17:00` }));
                    setEventDlg(true);
                  }}
                  sx={{
                    bgcolor: isWeekend && cell
                      ? (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50')
                      : theme.palette.background.paper,
                    minHeight: 150, p: 0.75, opacity: cell ? 1 : 0.3,
                    cursor: cell && !isClient ? 'pointer' : 'default',
                    '&:hover': cell && !isClient ? { bgcolor: theme.palette.action.hover } : {},
                  }}>
                  {cell && (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isToday ? theme.palette.primary.main : 'transparent' }}>
                          <Typography fontWeight={isToday ? 700 : 500}
                            sx={{ color: isToday ? '#fff' : 'text.primary', fontSize: '0.85rem' }}>
                            {cell.date()}
                          </Typography>
                        </Box>
                        {total > 0 && (
                          <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>{total} item{total > 1 ? 's' : ''}</Typography>
                        )}
                      </Box>
                      {dayEngs.slice(0, 2).map(eng => (
                        <EngagementChip key={`eng-${eng.id}`} engagement={eng} onClick={() => openEngDetail(eng)} />
                      ))}
                      {dayGrcs.slice(0, Math.max(0, visible - dayEngs.length)).map(a => (
                        <GrcAssessmentChip key={`grc-${a.id}`} assessment={a} onClick={() => navigate(`/assessments/${a.id}`)} />
                      ))}
                      {dayGrcProjects.slice(0, Math.max(0, visible - dayEngs.length - dayGrcs.length)).map(p => (
                        <GrcProjectChip key={`grc-project-${p.id}`} project={p} onClick={() => navigate(`/grc/${p.id}`)} />
                      ))}
                      {dayEvs.slice(0, Math.max(0, visible - dayEngs.length - dayGrcs.length - dayGrcProjects.length)).map(ev => (
                        <EventChip key={ev.id} event={ev} onClick={openDetail} />
                      ))}
                      {total > visible && (
                        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600, mt: 0.3 }}>
                          +{total - visible} more
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* ── TEAM / RESOURCE VIEW ── */}
      {viewMode === 'team' && (
        <Paper sx={{ p: 2, mb: 3, overflow: 'hidden' }}>
          {/* Week navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <IconButton onClick={() => setWeekStart(w => w.subtract(1, 'week'))} size="small"><ChevronLeft /></IconButton>
            <Typography variant="h6" fontWeight={600} sx={{ flex: 1, textAlign: 'center' }}>
              Week of {weekStart.format('MMM D')} – {weekStart.add(6, 'day').format('MMM D, YYYY')}
            </Typography>
            <Button size="small" onClick={goToday}>Today</Button>
            <IconButton onClick={() => setWeekStart(w => w.add(1, 'week'))} size="small"><ChevronRight /></IconButton>
          </Box>

          {loading && <LinearProgress sx={{ mb: 1 }} />}

          <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 380px)', minHeight: 160 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', userSelect: 'none', WebkitUserSelect: 'none' }}>
              <thead>
                <tr>
                  <th style={{ width: 170, padding: '8px 12px', textAlign: 'left', borderBottom: `2px solid ${theme.palette.divider}`, background: theme.palette.background.paper, position: 'sticky', top: 0, zIndex: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">TEAM MEMBER</Typography>
                  </th>
                  {wDays.map(d => {
                    const isToday = d.isSame(today, 'day');
                    return (
                      <th key={d.format('YYYY-MM-DD')} style={{ padding: '8px 6px', textAlign: 'center', minWidth: 120, borderBottom: `2px solid ${theme.palette.divider}`, background: isToday ? `${theme.palette.primary.main}10` : theme.palette.background.paper, borderLeft: `1px solid ${theme.palette.divider}`, position: 'sticky', top: 0, zIndex: 2 }}>
                        <Typography variant="caption" fontWeight={isToday ? 700 : 600} color={isToday ? 'primary' : 'text.secondary'}>
                          {d.format('ddd')}
                        </Typography>
                        <Typography variant="caption" display="block" fontWeight={isToday ? 700 : 400}
                          sx={{ color: isToday ? theme.palette.primary.main : 'text.primary', fontSize: '0.8rem' }}>
                          {d.format('D')}
                        </Typography>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody onDragEnd={() => {
                dragOverRef.current = { member: null, day: null };
                dragGrcRef.current  = null;
                dragGrcProjectRef.current = null;
                setDragEng(null); setDragTask(null); setDragGridEvent(null);
                setDragPoolEvent(null); setDragGrcAssessment(null); setDragGrcProject(null); setDragSourceMember(null);
                setDragOverMember(null); setDragOverDay(null);
              }}>
                {displayMembers.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: theme.palette.text.secondary }}>
                    No team members found. Add pentesters or project managers in Team &amp; Clients.
                  </td></tr>
                ) : displayMembers.map((member, mi) => (
                  <tr key={member.id} style={{ background: mi % 2 === 0 ? 'transparent' : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)') }}>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.palette.divider}`, verticalAlign: 'top' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar src={member.avatar} sx={{ width: 28, height: 28, bgcolor: theme.palette.primary.main, fontSize: '0.65rem' }}>
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                            {member.first_name} {member.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                            {member.role_display || member.role}
                          </Typography>
                        </Box>
                      </Box>
                    </td>
                    {wDays.map(day => {
                      const isToday    = day.isSame(today, 'day');
                      const cellDate   = day.format('YYYY-MM-DD');
                      const { engs: memberEngs, evs: memberEvs, tasks: memberTasks, grcs: memberGrcs, grcProjects: memberGrcProjects } =
                        memberDayData[`${member.id}:${cellDate}`] || { engs: [], evs: [], tasks: [], grcs: [], grcProjects: [] };
                      const isEmpty    = memberEngs.length === 0 && memberEvs.length === 0 && memberTasks.length === 0 && memberGrcs.length === 0 && memberGrcProjects.length === 0;
                      const isDragSource = dragEng
                        ? memberEngs.some(e => e.id === dragEng.id)
                        : dragTask
                        ? memberTasks.some(t => t.id === dragTask.id)
                        : dragGridEvent
                        ? memberEvs.some(e => e.id === dragGridEvent.id)
                        : dragGrcAssessment
                        ? memberGrcs.some(a => a.id === dragGrcAssessment.id)
                        : dragGrcProject
                        ? memberGrcProjects.some(p => p.id === dragGrcProject.id)
                        : false;
                      const isInPreview  = !!projectedRange &&
                        sameId(dragOverMember, member.id) &&
                        cellDate >= projectedRange.new_start_date &&
                        cellDate <= projectedRange.new_end_date;
                      // Highlight drop target for pool event drags (single cell, no range preview)
                      const isEventDrop  = (!!dragPoolEvent || !!dragGridEvent || !!dragGrcAssessment || !!dragGrcRef.current || !!dragGrcProject || !!dragGrcProjectRef.current) && sameId(dragOverMember, member.id) && cellDate === dragOverDay;
                      const isDropCell   = (isInPreview && cellDate === dragOverDay) || isEventDrop;
                      return (
                        <td key={cellDate}
                          onDragOver={(e) => {
                            if (dragEng || dragPoolEvent || dragTask || dragGridEvent || dragGrcAssessment || dragGrcRef.current || dragGrcProject || dragGrcProjectRef.current) {
                              e.preventDefault();
                              if (!sameId(dragOverRef.current.member, member.id) || dragOverRef.current.day !== cellDate) {
                                dragOverRef.current = { member: member.id, day: cellDate };
                                setDragOverMember(member.id);
                                setDragOverDay(cellDate);
                              }
                            }
                          }}
                          onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                              if (sameId(dragOverMember, member.id) && dragOverDay === cellDate) {
                                setDragOverMember(null);
                                setDragOverDay(null);
                              }
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (dragEng && dragSourceMember && !sameId(member.id, dragSourceMember.id)) {
                              setReassignDlg({ engagement: dragEng, targetMember: member, sourceMember: dragSourceMember, targetDay: day });
                            } else if (dragEng && dragSourceMember && sameId(member.id, dragSourceMember.id) && day.format('YYYY-MM-DD') !== dragEng.start_date) {
                              handleDateOnlyChange(dragEng, day);
                            } else if (dragEng && !dragSourceMember) {
                              handleAssignFromPool(dragEng, member, day);
                            } else if (dragTask && dragSourceMember && !sameId(member.id, dragSourceMember.id)) {
                              handleDragTaskInGrid(dragTask, member, day);
                            } else if (dragTask && dragSourceMember && sameId(member.id, dragSourceMember.id) && day.format('YYYY-MM-DD') !== dragTask.due_date) {
                              handleDragTaskInGrid(dragTask, member, day); // same member, date change
                            } else if (dragTask && !dragSourceMember) {
                              handleAssignTaskFromPool(dragTask, member, day);
                            } else if (dragGridEvent) {
                              handleDragEventInGrid(dragGridEvent, member, day);
                            } else if (dragPoolEvent) {
                              handleAssignEventFromPool(dragPoolEvent, member, day);
                            } else if (dragGrcAssessment || dragGrcRef.current) {
                              const grcItem = dragGrcAssessment || dragGrcRef.current;
                              if (dragSourceMember && !sameId(member.id, dragSourceMember.id)) {
                                setGrcReassignDlg({ assessment: grcItem, targetMember: member, sourceMember: dragSourceMember, targetDay: day });
                              } else {
                                handleAssignGrcFromPool(grcItem, member, day);
                              }
                            } else if (dragGrcProject || dragGrcProjectRef.current) {
                              handleAssignGrcProjectFromPool(dragGrcProject || dragGrcProjectRef.current, member, day);
                            }
                            setDragOverMember(null);
                            setDragOverDay(null);
                          }}
                          onClick={() => {
                            if (isEmpty && !dragEng) {
                              const ds = day.format('YYYY-MM-DD');
                              setNewEvent(e => ({ ...e, start_date: `${ds}T09:00`, end_date: `${ds}T17:00`, attendee_ids: [member.id] }));
                              setEventDlg(true);
                            }
                          }}
                          style={{
                            padding: '6px',
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            borderLeft: `1px solid ${theme.palette.divider}`,
                            verticalAlign: 'top',
                            background: isDropCell
                              ? `${theme.palette.primary.main}22`
                              : isInPreview
                              ? `${theme.palette.primary.main}0D`
                              : isDragSource
                              ? `${theme.palette.primary.main}06`
                              : isToday
                              ? `${theme.palette.primary.main}06`
                              : 'transparent',
                            outline: isDropCell
                              ? `2px dashed ${theme.palette.primary.main}`
                              : isInPreview
                              ? `1px dashed ${theme.palette.primary.main}55`
                              : 'none',
                            minHeight: 80,
                            cursor: isEmpty && !dragEng ? 'pointer' : 'default',
                            transition: 'background 0.08s, outline 0.08s',
                          }}>
                          {memberEngs.map(eng => (
                            <TeamEngBlock
                              key={`eng-${eng.id}`}
                              engagement={eng}
                              onClick={() => openEngDetail(eng, member)}
                              onDragStart={(e) => { setDragEng(e); setDragSourceMember(member); }}
                              isDragging={dragEng?.id === eng.id}
                            />
                          ))}
                          {memberEvs.map(ev => (
                            <TeamEventBlock
                              key={`ev-${ev.id}`}
                              event={ev}
                              onClick={openDetail}
                              onDragStart={(ev) => { setDragGridEvent(ev); setDragSourceMember(member); }}
                              isDragging={dragGridEvent?.id === ev.id}
                            />
                          ))}
                          {memberTasks.map(t => (
                            <TeamTaskBlock
                              key={`task-${t.id}`}
                              task={t}
                              onClick={() => setTaskDetail({ ...t })}
                              onDragStart={(t) => { setDragTask(t); setDragSourceMember(member); }}
                              isDragging={dragTask?.id === t.id}
                            />
                          ))}
                          {memberGrcs.map(a => (
                            <GrcAssessmentChip
                              key={`grc-${a.id}`}
                              assessment={a}
                              onClick={() => navigate(`/assessments/${a.id}`)}
                              onDragStart={(a) => { dragGrcRef.current = a; setDragGrcAssessment(a); setDragSourceMember(member); setDragEng(null); }}
                              isDragging={dragGrcAssessment?.id === a.id}
                            />
                          ))}
                          {memberGrcProjects.map(p => (
                            <GrcProjectChip
                              key={`grc-project-${p.id}`}
                              project={p}
                              onClick={() => navigate(`/grc/${p.id}`)}
                              onDragStart={(p) => { dragGrcProjectRef.current = p; setDragGrcProject(p); setDragSourceMember(member); setDragEng(null); }}
                              isDragging={dragGrcProject?.id === p.id}
                            />
                          ))}
                          {isEmpty && !dragEng && (
                            <Box sx={{ height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, '&:hover': { opacity: 1 } }}>
                              <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>+ Add</Typography>
                            </Box>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          {/* Engagement legend */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mr: 2 }}>ENGAGEMENT STATUS:</Typography>
            {Object.entries(ENG_STATUS).map(([k, v]) => (
              <Chip key={k} label={v.label} size="small"
                sx={{ mr: 0.5, mb: 0.5, fontSize: '0.6rem', height: 18, bgcolor: v.bg, color: v.text, border: `1px solid ${v.border}` }} />
            ))}
          </Box>
        </Paper>
      )}

      {/* ── Unassigned pool (team view only) ── */}
      {viewMode === 'team' && !isClient && (
        <Paper
          onDragOver={(e) => {
            if (dragSourceMember && (dragEng || dragTask || dragGridEvent || dragGrcAssessment || dragGrcRef.current || dragGrcProject || dragGrcProjectRef.current)) {
              e.preventDefault();
              setDraggingOverPool(true);
            }
          }}
          onDragLeave={(e) => {
            // Only clear if leaving the Paper entirely (not entering a child)
            if (!e.currentTarget.contains(e.relatedTarget)) setDraggingOverPool(false);
          }}
          onDrop={(e) => { e.preventDefault(); handleReturnToPool(); }}
          sx={{
            p: 2, mb: 3,
            outline: draggingOverPool ? `3px dashed ${theme.palette.primary.main}` : 'none',
            bgcolor: draggingOverPool ? `${theme.palette.primary.main}08` : undefined,
            transition: 'outline 0.1s, background-color 0.1s',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>Unassigned Pool</Typography>
              {(() => {
                const poolTotal = unassignedEngagements.length + unassignedTasks.length + unassignedEvents.length + unassignedGrcAssessments.length + unassignedGrcProjects.length;
                return poolTotal > 0
                  ? <Chip label={poolTotal} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#c0392b', color: '#fff' }} />
                  : <Chip label="0" size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#27ae60', color: '#fff' }} />;
              })()}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 1.5 }}>
              Drag onto a team member row to assign · Drag back here to unassign
            </Typography>
          </Box>

          <Tabs value={poolTab} onChange={(_, v) => setPoolTab(v)} sx={{ mb: 1.5, minHeight: 36 }} TabIndicatorProps={{ style: { height: 2 } }}>
            <Tab label={`Penetration Tests (${unassignedEngagements.length})`} sx={{ minHeight: 36, fontSize: '0.78rem', py: 0.5 }} />
            <Tab label={`Tasks (${unassignedTasks.length})`} sx={{ minHeight: 36, fontSize: '0.78rem', py: 0.5 }} />
            <Tab label={`Events (${unassignedEvents.length})`} sx={{ minHeight: 36, fontSize: '0.78rem', py: 0.5 }} />
            <Tab label={`GRC (${unassignedGrcAssessments.length + unassignedGrcProjects.length})`} sx={{ minHeight: 36, fontSize: '0.78rem', py: 0.5, color: (unassignedGrcAssessments.length + unassignedGrcProjects.length) > 0 ? '#7c3aed' : undefined }} />
          </Tabs>

          {/* Tab 0: Engagements */}
          {poolTab === 0 && (
            unassignedEngagements.length === 0 ? (
              <Box sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#27ae6015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check sx={{ fontSize: 18, color: '#27ae60' }} />
                </Box>
                <Typography variant="body2">All engagements are assigned.</Typography>
              </Box>
            ) : (
              <Box sx={{
                display: 'flex', gap: 1.5,
                overflowX: 'auto', pb: 1,
                '&::-webkit-scrollbar': { height: 5 },
                '&::-webkit-scrollbar-track': { bgcolor: 'action.hover', borderRadius: 3 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'text.disabled', borderRadius: 3 },
              }}>
                {unassignedEngagements.map(eng => {
                  const s = ENG_STATUS[eng.status] || ENG_STATUS.PLANNING;
                  const isDraggingThis = dragEng?.id === eng.id;
                  return (
                    <Box
                      key={eng.id}
                      draggable
                      onDragStart={() => { setDragEng(eng); setDragSourceMember(null); }}
                      onDragEnd={() => { setDragEng(null); setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null); }}
                      onClick={() => openEngDetail(eng)}
                      sx={{
                        flexShrink: 0, width: 210,
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid`,
                        borderColor: isDraggingThis ? s.border : 'divider',
                        borderTop: `3px solid ${s.border}`,
                        borderRadius: '8px',
                        p: 1.5,
                        cursor: isDraggingThis ? 'grabbing' : 'grab',
                        opacity: isDraggingThis ? 0.35 : 1,
                        boxShadow: isDraggingThis ? 0 : '0 1px 4px rgba(0,0,0,0.08)',
                        transition: 'all 0.15s ease',
                        '& *': { pointerEvents: 'none' },
                        '&:hover': {
                          boxShadow: isDraggingThis ? 0 : '0 4px 12px rgba(0,0,0,0.12)',
                          transform: isDraggingThis ? 'none' : 'translateY(-2px)',
                          borderColor: s.border,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.75 }}>
                        <DragIndicator sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0, mt: 0.15 }} />
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3, color: 'text.primary', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {eng.name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75, flexWrap: 'wrap' }}>
                        <Chip label={s.label} size="small"
                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: s.bg, color: s.text, border: `1px solid ${s.border}50` }} />
                        {eng.skip_weekends && (
                          <Chip label="No weekends" size="small" icon={<WeekendOutlined sx={{ fontSize: '11px !important' }} />}
                            sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#fff3e0', color: '#e65100', border: '1px solid #ffcc0240' }} />
                        )}
                      </Box>
                      {eng.client_name && (
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🏢 {eng.client_name}
                        </Typography>
                      )}
                      <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', fontFamily: 'monospace' }}>
                        {eng.start_date} → {eng.end_date}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )
          )}

          {/* Tab 1: Tasks */}
          {poolTab === 1 && (
            unassignedTasks.length === 0 ? (
              <Box sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#27ae6015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check sx={{ fontSize: 18, color: '#27ae60' }} />
                </Box>
                <Typography variant="body2">All tasks are assigned.</Typography>
              </Box>
            ) : (
              <Box sx={{
                display: 'flex', gap: 1.5,
                overflowX: 'auto', pb: 1,
                '&::-webkit-scrollbar': { height: 5 },
                '&::-webkit-scrollbar-track': { bgcolor: 'action.hover', borderRadius: 3 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'text.disabled', borderRadius: 3 },
              }}>
                {unassignedTasks.map(task => {
                  const color = PRIORITY_COLORS[task.priority] || '#7f8c8d';
                  const isDraggingThis = dragTask?.id === task.id;
                  return (
                    <Box
                      key={task.id}
                      draggable
                      onDragStart={() => { setDragTask(task); setDragSourceMember(null); }}
                      onDragEnd={() => { setDragTask(null); setDragSourceMember(null); setDragOverMember(null); setDragOverDay(null); }}
                      onClick={() => setTaskDetail({ ...task })}
                      sx={{
                        flexShrink: 0, width: 210,
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid`,
                        borderColor: isDraggingThis ? color : 'divider',
                        borderTop: `3px solid ${color}`,
                        borderRadius: '8px',
                        p: 1.5,
                        cursor: isDraggingThis ? 'grabbing' : 'grab',
                        opacity: isDraggingThis ? 0.35 : 1,
                        boxShadow: isDraggingThis ? 0 : '0 1px 4px rgba(0,0,0,0.08)',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          boxShadow: isDraggingThis ? 0 : '0 4px 12px rgba(0,0,0,0.12)',
                          transform: isDraggingThis ? 'none' : 'translateY(-2px)',
                          borderColor: color,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.75 }}>
                        <DragIndicator sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0, mt: 0.15 }} />
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3, color: 'text.primary', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          📋 {task.title}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75, flexWrap: 'wrap' }}>
                        <Chip label={task.priority} size="small"
                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, bgcolor: `${color}20`, color, border: `1px solid ${color}50` }} />
                        <Chip label={task.status_display || task.status} size="small"
                          sx={{ height: 18, fontSize: '0.62rem', bgcolor: TASK_STATUS_COLORS[task.status], color: '#fff' }} />
                      </Box>
                      {task.due_date && (
                        <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', fontFamily: 'monospace' }}>
                          Due: {task.due_date}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )
          )}

          {/* Tab 3: GRC Assessments (unassigned — no consultant) */}
          {poolTab === 3 && (
            (unassignedGrcAssessments.length + unassignedGrcProjects.length) === 0 ? (
              <Box sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#27ae6015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check sx={{ fontSize: 18, color: '#27ae60' }} />
                </Box>
                <Typography variant="body2">All GRC work has an owner assigned.</Typography>
              </Box>
            ) : (
              <Box sx={{
                display: 'flex', gap: 1.5,
                overflowX: 'auto', pb: 1,
                '&::-webkit-scrollbar': { height: 5 },
                '&::-webkit-scrollbar-track': { bgcolor: 'action.hover', borderRadius: 3 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'text.disabled', borderRadius: 3 },
              }}>
                {unassignedGrcProjects.map(p => {
                  const s = GRC_PROJECT_STATUS[p.status] || GRC_PROJECT_STATUS.ACTIVE;
                  const isDraggingThis = dragGrcProject?.id === p.id;
                  return (
                    <div
                      key={`grc-project-${p.id}`}
                      draggable="true"
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', `grc-project:${p.id}`);
                        e.dataTransfer.effectAllowed = 'move';
                        dragGrcProjectRef.current = p;
                        setDragGrcProject(p);
                        setDragGrcAssessment(null);
                        setDragEng(null);
                        setDragSourceMember(null);
                      }}
                      onDragEnd={() => {
                        dragGrcProjectRef.current = null;
                        setDragGrcProject(null);
                        setDragOverMember(null);
                        setDragOverDay(null);
                      }}
                      onClick={() => navigate(`/grc/${p.id}`)}
                      style={{
                        flexShrink: 0, width: 210,
                        background: theme.palette.background.paper,
                        border: `1px solid ${isDraggingThis ? s.border : theme.palette.divider}`,
                        borderTop: `3px solid ${s.border}`,
                        borderRadius: 8,
                        padding: 12,
                        cursor: isDraggingThis ? 'grabbing' : 'grab',
                        opacity: isDraggingThis ? 0.35 : 1,
                        boxShadow: isDraggingThis ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                        userSelect: 'none',
                        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 6, pointerEvents: 'none' }}>
                        <span style={{ fontSize: 12, color: '#999', flexShrink: 0 }}>::</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          GRC Project · {p.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap', pointerEvents: 'none' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 600, background: s.bg, color: s.text, border: `1px solid ${s.border}50`, borderRadius: 10, padding: '1px 6px' }}>
                          Project · {s.label}
                        </span>
                        <span style={{ fontSize: '0.62rem', background: '#fef2f2', color: '#c0392b', border: '1px solid #c0392b40', borderRadius: 10, padding: '1px 6px' }}>
                          Unassigned
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 4, pointerEvents: 'none' }}>
                        {p.framework_name || p.framework_key || 'GRC'}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#aaa', fontFamily: 'monospace', pointerEvents: 'none' }}>
                        Target: {p.target_date || 'Not scheduled'}
                      </div>
                    </div>
                  );
                })}
                {unassignedGrcAssessments.map(a => {
                  const s = GRC_STATUS[a.status] || GRC_STATUS.DRAFT;
                  const isDraggingThis = dragGrcAssessment?.id === a.id;
                  return (
                    <div
                      key={a.id}
                      draggable="true"
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(a.id));
                        e.dataTransfer.effectAllowed = 'move';
                        dragGrcRef.current = a;
                        setDragGrcAssessment(a);
                        setDragEng(null);
                        setDragSourceMember(null);
                      }}
                      onDragEnd={() => {
                        dragGrcRef.current = null;
                        setDragGrcAssessment(null);
                        setDragOverMember(null);
                        setDragOverDay(null);
                      }}
                      onClick={() => navigate(`/assessments/${a.id}`)}
                      style={{
                        flexShrink: 0, width: 210,
                        background: theme.palette.background.paper,
                        border: `1px solid ${isDraggingThis ? s.border : theme.palette.divider}`,
                        borderTop: `3px solid ${s.border}`,
                        borderRadius: 8,
                        padding: 12,
                        cursor: isDraggingThis ? 'grabbing' : 'grab',
                        opacity: isDraggingThis ? 0.35 : 1,
                        boxShadow: isDraggingThis ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                        userSelect: 'none',
                        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 6, pointerEvents: 'none' }}>
                        <span style={{ fontSize: 12, color: '#999', flexShrink: 0 }}>⠿</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          🛡️ {a.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap', pointerEvents: 'none' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 600, background: s.bg, color: s.text, border: `1px solid ${s.border}50`, borderRadius: 10, padding: '1px 6px' }}>
                          GRC · {s.label}
                        </span>
                        <span style={{ fontSize: '0.62rem', background: '#fef2f2', color: '#c0392b', border: '1px solid #c0392b40', borderRadius: 10, padding: '1px 6px' }}>
                          Unassigned
                        </span>
                      </div>
                      {a.framework && (
                        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 4, pointerEvents: 'none' }}>
                          {a.framework_display || a.framework}
                        </div>
                      )}
                      <div style={{ fontSize: '0.65rem', color: '#aaa', fontFamily: 'monospace', pointerEvents: 'none' }}>
                        {a.start_date || '—'} → {a.end_date || '—'}
                      </div>
                    </div>
                  );
                })}
              </Box>
            )
          )}

          {/* Tab 2: Events */}
          {poolTab === 2 && (
            unassignedEvents.length === 0 ? (
              <Box sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#27ae6015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check sx={{ fontSize: 18, color: '#27ae60' }} />
                </Box>
                <Typography variant="body2">All events are assigned.</Typography>
              </Box>
            ) : (
              <Box sx={{
                display: 'flex', gap: 1.5,
                overflowX: 'auto', pb: 1,
                '&::-webkit-scrollbar': { height: 5 },
                '&::-webkit-scrollbar-track': { bgcolor: 'action.hover', borderRadius: 3 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'text.disabled', borderRadius: 3 },
              }}>
                {unassignedEvents.map(ev => {
                  const color = EVENT_COLORS[ev.event_type] || '#7b1fa2';
                  const icon  = EVENT_ICONS[ev.event_type]  || '📌';
                  const isDraggingThis = dragPoolEvent?.id === ev.id;
                  return (
                    <Box
                      key={`ev-${ev.id}`}
                      draggable
                      onDragStart={() => { setDragPoolEvent(ev); setDragEng(null); setDragSourceMember(null); }}
                      onDragEnd={() => { setDragPoolEvent(null); setDragOverMember(null); setDragOverDay(null); }}
                      onClick={() => openDetail(ev)}
                      sx={{
                        flexShrink: 0, width: 210,
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid`,
                        borderColor: isDraggingThis ? color : 'divider',
                        borderTop: `3px solid ${color}`,
                        borderRadius: '8px',
                        p: 1.5,
                        cursor: isDraggingThis ? 'grabbing' : 'grab',
                        opacity: isDraggingThis ? 0.35 : 1,
                        boxShadow: isDraggingThis ? 0 : '0 1px 4px rgba(0,0,0,0.08)',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          boxShadow: isDraggingThis ? 0 : '0 4px 12px rgba(0,0,0,0.12)',
                          transform: isDraggingThis ? 'none' : 'translateY(-2px)',
                          borderColor: color,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.75 }}>
                        <DragIndicator sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0, mt: 0.15 }} />
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3, color: 'text.primary', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {icon} {ev.title}
                        </Typography>
                      </Box>
                      <Chip label={ev.event_type_display || ev.event_type} size="small"
                        sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, mb: 0.75, bgcolor: `${color}18`, color, border: `1px solid ${color}50` }} />
                      <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', fontFamily: 'monospace' }}>
                        {ev.start_date?.slice(0, 10)} → {ev.end_date?.slice(0, 10)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )
          )}
        </Paper>
      )}

      {/* ── TASK VIEW ── */}
      {viewMode === 'tasks' && !isClient && (
        <Box>
          {/* Controls & stats */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
              <TextField size="small" placeholder="Search tasks…" value={taskSearchQ} onChange={e => setTaskSearchQ(e.target.value)}
                sx={{ minWidth: 180, flexGrow: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />

              <TextField size="small" select label="Status" value={taskStatusF} onChange={e => setTaskStatusF(e.target.value)} sx={{ minWidth: 130 }}>
                <MenuItem value="">All statuses</MenuItem>
                {TASK_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{colLabel(s.value, s.label)}</MenuItem>)}
              </TextField>

              <TextField size="small" select label="Priority" value={taskPriorityF} onChange={e => setTaskPriorityF(e.target.value)} sx={{ minWidth: 120 }}>
                <MenuItem value="">All priorities</MenuItem>
                {PRIORITIES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </TextField>

              <TextField size="small" select label="Assignee" value={taskAssigneeF} onChange={e => setTaskAssigneeF(e.target.value)} sx={{ minWidth: 160 }}>
                <MenuItem value="">All members</MenuItem>
                {members.map(m => <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>)}
              </TextField>

              <TextField size="small" select label="Engagement" value={taskEngF} onChange={e => setTaskEngF(e.target.value)} sx={{ minWidth: 180 }}>
                <MenuItem value="">All engagements</MenuItem>
                {engagements.map(e => <MenuItem key={e.id} value={String(e.id)}>{e.name}</MenuItem>)}
              </TextField>

              {(taskSearchQ || taskStatusF || taskPriorityF || taskAssigneeF || taskEngF) && (
                <Button size="small" onClick={() => { setTaskSearchQ(''); setTaskStatusF(''); setTaskPriorityF(''); setTaskAssigneeF(''); setTaskEngF(''); }}>
                  Clear
                </Button>
              )}

              <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <ToggleButtonGroup value={taskViewMode} exclusive onChange={(_, v) => v && setTaskViewMode(v)} size="small">
                  <ToggleButton value="board"><Tooltip title="Board"><GridView fontSize="small" /></Tooltip></ToggleButton>
                  <ToggleButton value="list"><Tooltip title="List"><ViewList fontSize="small" /></Tooltip></ToggleButton>
                </ToggleButtonGroup>
                <Button variant="contained" startIcon={<Add />} size="small"
                  onClick={() => { setNewTask(BLANK_TASK); setTaskDlg(true); }}
                  sx={{ bgcolor: theme.palette.primary.main }}>
                  New Task
                </Button>
              </Box>
            </Box>

            {/* Stats row */}
            <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {TASK_STATUSES.map(s => {
                const base = mineOnly ? tasks.filter(t => sameId(t.assigned_to, myUserId)) : tasks;
                const count = base.filter(t => t.status === s.value).length;
                return (
                  <Box key={s.value} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, cursor: 'pointer' }}
                    onClick={() => setTaskStatusF(taskStatusF === s.value ? '' : s.value)}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: taskStatusF === s.value ? s.color : 'text.secondary', fontWeight: taskStatusF === s.value ? 700 : 400 }}>
                      {colLabel(s.value, s.label)}: <strong>{count}</strong>
                    </Typography>
                  </Box>
                );
              })}
              {taskOverdueCount > 0 && (
                <Chip label={`⚠ ${taskOverdueCount} overdue`} size="small"
                  sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#fde8e8', color: '#c0392b', fontWeight: 700, border: '1px solid #c0392b40' }} />
              )}
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                {mineOnly ? 'My tasks · ' : ''}{filteredTasksForView.length} of {tasks.length} total
              </Typography>
            </Box>
          </Paper>

          {/* Mine-only active banner */}
          {mineOnly && filteredTasksForView.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No tasks are currently assigned to you. Turn off <strong>Mine only</strong> in the filter bar to see all tasks.
            </Alert>
          )}

          {/* ── Kanban Board ── */}
          {taskViewMode === 'board' && (
            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
              {TASK_STATUSES.map(col => {
                const colTasks = filteredTasksForView.filter(t => t.status === col.value);
                const isDragTarget = kanbanDragOver === col.value;
                return (
                  <Box key={col.value}
                    onDragOver={(e) => { e.preventDefault(); if (kanbanDragTask) setKanbanDragOver(col.value); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setKanbanDragOver(null); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (kanbanDragTask && kanbanDragTask.status !== col.value)
                        handleUpdateTask(kanbanDragTask.id, { status: col.value });
                      setKanbanDragTask(null); setKanbanDragOver(null);
                    }}
                    sx={{
                      flexShrink: 0, width: 280, minHeight: 450,
                      bgcolor: isDragTarget ? `${col.color}10` : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                      borderRadius: 2, p: 1.5,
                      border: '1px solid', borderColor: isDragTarget ? col.color : 'divider',
                      outline: isDragTarget ? `2px dashed ${col.color}80` : 'none',
                      transition: 'border-color 0.1s, background 0.1s',
                    }}>
                    {/* Column header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color, flexShrink: 0 }} />
                      {editingColumn === col.value ? (
                        <TextField
                          autoFocus size="small" variant="standard"
                          value={colLabel(col.value, col.label)}
                          onChange={e => saveColumnLabel(col.value, e.target.value)}
                          onBlur={() => setEditingColumn(null)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingColumn(null); }}
                          sx={{ flex: 1, '& .MuiInput-input': { fontSize: '0.82rem', fontWeight: 700, color: col.color, p: 0 } }}
                          inputProps={{ maxLength: 30 }}
                        />
                      ) : (
                        <Tooltip title="Click to rename column">
                          <Typography variant="subtitle2" fontWeight={700}
                            sx={{ flex: 1, fontSize: '0.8rem', color: col.color, cursor: 'text', '&:hover': { textDecoration: 'underline dotted' } }}
                            onClick={() => setEditingColumn(col.value)}>
                            {colLabel(col.value, col.label)}
                          </Typography>
                        </Tooltip>
                      )}
                      <Chip label={colTasks.length} size="small"
                        sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, bgcolor: `${col.color}18`, color: col.color, border: `1px solid ${col.color}40` }} />
                      <Tooltip title={`New task in ${colLabel(col.value, col.label)}`}>
                        <IconButton size="small" onClick={() => {
                          setNewTask({ ...BLANK_TASK, status: col.value });
                          setTaskDlg(true);
                        }}>
                          <Add sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Task cards */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {colTasks.map(task => {
                        const pColor   = PRIORITY_COLORS[task.priority] || '#7f8c8d';
                        const isOver   = task.due_date && task.due_date < today.format('YYYY-MM-DD') && task.status !== 'DONE';
                        const assignee = members.find(m => m.id === task.assigned_to);
                        return (
                          <Box key={task.id}
                            draggable
                            onDragStart={() => setKanbanDragTask(task)}
                            onDragEnd={() => { setKanbanDragTask(null); setKanbanDragOver(null); }}
                            onClick={() => setTaskDetail({ ...task })}
                            sx={{
                              bgcolor: theme.palette.background.paper,
                              borderRadius: 1.5, p: 1.25,
                              borderLeft: `3px solid ${pColor}`,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              cursor: 'grab',
                              opacity: kanbanDragTask?.id === task.id ? 0.35 : 1,
                              '&:hover': { boxShadow: '0 3px 10px rgba(0,0,0,0.13)', transform: 'translateY(-1px)' },
                              transition: 'box-shadow 0.12s, transform 0.12s',
                              '&:active': { cursor: 'grabbing' },
                            }}>
                            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75, lineHeight: 1.35, fontSize: '0.82rem' }}>
                              {task.title}
                            </Typography>
                            {task.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', mb: 0.75, fontSize: '0.7rem', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {task.description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
                              <Chip label={task.priority} size="small"
                                sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, bgcolor: `${pColor}18`, color: pColor, border: `1px solid ${pColor}40` }} />
                              {isOver && (
                                <Chip label="Overdue" size="small"
                                  sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, bgcolor: '#fde8e8', color: '#c0392b', border: '1px solid #c0392b40' }} />
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              {task.due_date && (
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: isOver ? '#c0392b' : 'text.secondary', fontWeight: isOver ? 700 : 400 }}>
                                  📅 {task.due_date}
                                </Typography>
                              )}
                              {task.engagement_name && (
                                <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem', color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  🏢 {task.engagement_name}
                                </Typography>
                              )}
                              {assignee && (
                                <Tooltip title={`${assignee.first_name} ${assignee.last_name}`}>
                                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.52rem', bgcolor: theme.palette.primary.main, ml: 'auto', flexShrink: 0 }}>
                                    {assignee.first_name?.[0]}{assignee.last_name?.[0]}
                                  </Avatar>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                      {colTasks.length === 0 && (
                        <Box sx={{ py: 4, textAlign: 'center', border: `2px dashed`, borderColor: isDragTarget ? col.color : 'divider', borderRadius: 1.5, color: 'text.disabled' }}>
                          <Typography variant="caption">{isDragTarget ? 'Drop here' : 'No tasks'}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* ── List View ── */}
          {taskViewMode === 'list' && (
            <Paper sx={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                    {[['TASK', null, ''], ['PRIORITY', 80, 'center'], ['STATUS', 150, 'center'], ['ASSIGNEE', 160, 'left'], ['DUE DATE', 110, 'left'], ['ENGAGEMENT', null, 'left'], ['ACTIONS', 100, 'center']].map(([label, w, align]) => (
                      <th key={label} style={{ textAlign: align || 'left', padding: '10px 12px', borderBottom: `2px solid ${theme.palette.divider}`, fontSize: '0.7rem', fontWeight: 700, color: theme.palette.text.secondary, ...(w ? { width: w } : {}) }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTasksForView.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: theme.palette.text.secondary }}>No tasks match the current filters.</td></tr>
                  )}
                  {filteredTasksForView.map((task, i) => {
                    const pColor   = PRIORITY_COLORS[task.priority] || '#7f8c8d';
                    const isOver   = task.due_date && task.due_date < today.format('YYYY-MM-DD') && task.status !== 'DONE';
                    const assignee = members.find(m => m.id === task.assigned_to);
                    return (
                      <tr key={task.id} onClick={() => setTaskDetail({ ...task })}
                        style={{
                          background: i % 2 === 0 ? 'transparent' : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                          cursor: 'pointer',
                        }}>
                        <td style={{ padding: '9px 12px', borderBottom: `1px solid ${theme.palette.divider}`, borderLeft: `3px solid ${pColor}` }}>
                          <Typography variant="body2" fontWeight={600} noWrap
                            sx={{ textDecoration: task.status === 'DONE' ? 'line-through' : 'none', color: task.status === 'DONE' ? 'text.disabled' : 'text.primary', maxWidth: 320 }}>
                            {task.title}
                          </Typography>
                          {task.description && (
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 320, fontSize: '0.68rem' }}>{task.description}</Typography>
                          )}
                        </td>
                        <td style={{ padding: '9px 8px', borderBottom: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                          <Chip label={task.priority} size="small"
                            sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: `${pColor}18`, color: pColor, border: `1px solid ${pColor}40` }} />
                        </td>
                        <td style={{ padding: '9px 8px', borderBottom: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}
                          onClick={e => e.stopPropagation()}>
                          <TextField select size="small" value={task.status}
                            onChange={e => handleUpdateTask(task.id, { status: e.target.value })}
                            sx={{ '& .MuiInputBase-input': { py: '4px', px: '8px', fontSize: '0.72rem', fontWeight: 700, color: TASK_STATUS_COLORS[task.status] }, '& .MuiOutlinedInput-notchedOutline': { borderColor: `${TASK_STATUS_COLORS[task.status]}60` } }}>
                            {TASK_STATUSES.map(s => <MenuItem key={s.value} value={s.value} sx={{ fontSize: '0.8rem' }}>{colLabel(s.value, s.label)}</MenuItem>)}
                          </TextField>
                        </td>
                        <td style={{ padding: '9px 8px', borderBottom: `1px solid ${theme.palette.divider}` }}>
                          {assignee ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Avatar sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: theme.palette.primary.main, flexShrink: 0 }}>
                                {assignee.first_name?.[0]}{assignee.last_name?.[0]}
                              </Avatar>
                              <Typography variant="caption" noWrap>{assignee.first_name} {assignee.last_name}</Typography>
                            </Box>
                          ) : <Typography variant="caption" color="text.disabled">Unassigned</Typography>}
                        </td>
                        <td style={{ padding: '9px 8px', borderBottom: `1px solid ${theme.palette.divider}` }}>
                          {task.due_date
                            ? <Typography variant="caption" sx={{ color: isOver ? '#c0392b' : 'text.secondary', fontWeight: isOver ? 700 : 400 }}>{isOver ? '⚠ ' : ''}{task.due_date}</Typography>
                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </td>
                        <td style={{ padding: '9px 8px', borderBottom: `1px solid ${theme.palette.divider}` }}>
                          {task.engagement_name
                            ? <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 200 }}>{task.engagement_name}</Typography>
                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </td>
                        <td style={{ padding: '9px 8px', borderBottom: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}
                          onClick={e => e.stopPropagation()}>
                          <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => setTaskDetail({ ...task })}><EditOutlined sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                            {task.status !== 'DONE' && (
                              <Tooltip title="Mark done"><IconButton size="small" sx={{ color: '#27ae60' }} onClick={() => handleUpdateTask(task.id, { status: 'DONE' })}><Check sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                            )}
                            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteTask(task.id)}><DeleteOutline sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                          </Box>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Paper>
          )}
        </Box>
      )}

      {/* ── Bottom info panels ── */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={!isClient ? 4 : 6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <EventIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={700}>Upcoming Events</Typography>
                <Chip label={upcomingEvents.length} size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.65rem', bgcolor: theme.palette.primary.main, color: '#fff' }} />
              </Box>
              {upcomingEvents.length === 0
                ? <Typography variant="body2" color="text.secondary">No upcoming events.</Typography>
                : (
                  <List dense disablePadding>
                    {upcomingEvents.map(ev => (
                      <React.Fragment key={ev.id}>
                        <ListItem button onClick={() => openDetail(ev)} sx={{ px: 0, py: 0.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ev.is_completed ? '#bdc3c7' : (EVENT_COLORS[ev.event_type] || '#999'), mr: 1.5, flexShrink: 0 }} />
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={500} noWrap sx={{ textDecoration: ev.is_completed ? 'line-through' : 'none', color: ev.is_completed ? 'text.disabled' : 'text.primary' }}>{ev.title}</Typography>}
                            secondary={<Typography variant="caption" color="text.secondary">{ev.start_date?.slice(0, 10)}{ev.engagement_name ? ` · ${ev.engagement_name}` : ''}</Typography>}
                          />
                          {ev.comments_count > 0 && <Chip label={ev.comments_count} size="small" icon={<CommentIcon sx={{ fontSize: '10px !important' }} />} sx={{ height: 16, fontSize: '0.6rem' }} />}
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                )
              }
            </CardContent>
          </Card>
        </Grid>

        {!isClient && (
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <TaskIcon sx={{ color: '#2980b9', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700}>Active Tasks</Typography>
                  <Chip label={activeTasks.length} size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.65rem', bgcolor: '#2980b9', color: '#fff' }} />
                </Box>
                {activeTasks.length === 0
                  ? <Typography variant="body2" color="text.secondary">All tasks complete!</Typography>
                  : (
                    <List dense disablePadding>
                      {activeTasks.slice(0, 8).map(t => (
                        <React.Fragment key={t.id}>
                          <ListItem button onClick={() => setTaskDetail({ ...t })} sx={{ px: 0, py: 0.5, alignItems: 'flex-start' }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>{t.title}</Typography>
                                  <Chip label={t.priority} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: PRIORITY_COLORS[t.priority], color: '#fff', flexShrink: 0 }} />
                                </Box>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                                  <Chip label={t.status_display || t.status} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: TASK_STATUS_COLORS[t.status], color: '#fff' }} />
                                  {t.due_date && <Typography variant="caption" color="text.secondary">Due {t.due_date}</Typography>}
                                  {t.assigned_to_name && <Typography variant="caption" color="text.secondary">· {t.assigned_to_name}</Typography>}
                                </Box>
                              }
                            />
                            {t.status !== 'DONE' && (
                              <ListItemSecondaryAction>
                                <Tooltip title="Mark complete">
                                  <IconButton edge="end" size="small" onClick={() => handleCompleteTask(t.id)}><Check fontSize="small" /></IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            )}
                          </ListItem>
                          <Divider component="li" />
                        </React.Fragment>
                      ))}
                    </List>
                  )
                }
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={!isClient ? 4 : 6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ScheduleIcon sx={{ color: '#d35400', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={700}>{isClient ? 'My Slot Requests' : 'Time Slot Requests'}</Typography>
                {pendingRequests.length > 0 && <Chip label={`${pendingRequests.length} pending`} size="small" color="warning" sx={{ ml: 'auto', height: 18, fontSize: '0.65rem' }} />}
              </Box>
              {requests.length === 0
                ? <Typography variant="body2" color="text.secondary">No requests yet.</Typography>
                : (
                  <List dense disablePadding>
                    {requests.slice(0, 8).map(r => (
                      <React.Fragment key={r.id}>
                        <ListItem sx={{ px: 0, py: 0.5, alignItems: 'flex-start' }}>
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={500} noWrap>{r.title}</Typography>}
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">{r.preferred_start?.slice(0, 10)} → {r.preferred_end?.slice(0, 10)}</Typography>
                                <Chip label={r.status_display || r.status} size="small" sx={{ height: 16, fontSize: '0.6rem', mt: 0.3, bgcolor: r.status === 'APPROVED' ? '#27ae60' : r.status === 'REJECTED' ? '#c0392b' : '#f39c12', color: '#fff' }} />
                              </Box>
                            }
                          />
                          {isAdmin && r.status === 'PENDING' && (
                            <ListItemSecondaryAction>
                              <Tooltip title="Approve"><IconButton size="small" onClick={() => handleApproveReq(r.id)}><Check fontSize="small" color="success" /></IconButton></Tooltip>
                              <Tooltip title="Reject"><IconButton size="small" onClick={() => handleRejectReq(r.id)}><Close fontSize="small" color="error" /></IconButton></Tooltip>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                )
              }
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ══ DIALOGS ══ */}

      {/* New Event */}
      <Dialog open={eventDlg} onClose={() => setEventDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Calendar Event</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Title" value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} fullWidth size="small" required />
          <TextField label="Description" value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} fullWidth size="small" multiline rows={2} />
          <TextField label="Event Type" value={newEvent.event_type} onChange={e => setNewEvent(p => ({ ...p, event_type: e.target.value }))} select fullWidth size="small">
            {EVENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          <TextField label="Engagement (optional)" value={newEvent.engagement} onChange={e => setNewEvent(p => ({ ...p, engagement: e.target.value }))} select fullWidth size="small">
            <MenuItem value="">— None —</MenuItem>
            {engagements.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
          </TextField>
          <Grid container spacing={1}>
            <Grid item xs={6}><TextField label="Start" type="datetime-local" value={newEvent.start_date} onChange={e => setNewEvent(p => ({ ...p, start_date: e.target.value }))} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField label="End" type="datetime-local" value={newEvent.end_date} onChange={e => setNewEvent(p => ({ ...p, end_date: e.target.value }))} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
          <TextField label="Attendees" value={newEvent.attendee_ids} onChange={e => setNewEvent(p => ({ ...p, attendee_ids: e.target.value }))} select SelectProps={{ multiple: true }} fullWidth size="small">
            {members.map(m => <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>)}
          </TextField>
          <TextField label="Location (optional)" value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} fullWidth size="small" />
          <FormControlLabel control={<Checkbox checked={newEvent.all_day} onChange={e => setNewEvent(p => ({ ...p, all_day: e.target.checked }))} />} label="All day" />
          <FormControlLabel control={<Checkbox checked={newEvent.is_client_visible} onChange={e => setNewEvent(p => ({ ...p, is_client_visible: e.target.checked }))} />} label="Visible to client" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateEvent} disabled={!newEvent.title || !newEvent.start_date} sx={{ bgcolor: theme.palette.primary.main }}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* New Task */}
      <Dialog open={taskDlg} onClose={() => setTaskDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Title" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} fullWidth size="small" required />
          <TextField label="Description" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} fullWidth size="small" multiline rows={2} />
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <TextField label="Priority" value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} select fullWidth size="small">
                {PRIORITIES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Status" value={newTask.status} onChange={e => setNewTask(p => ({ ...p, status: e.target.value }))} select fullWidth size="small">
                {TASK_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Due Date" type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} fullWidth size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
          <TextField label="Assign To" value={newTask.assigned_to} onChange={e => setNewTask(p => ({ ...p, assigned_to: e.target.value }))} select fullWidth size="small">
            <MenuItem value="">— Unassigned —</MenuItem>
            {members.map(m => <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>)}
          </TextField>
          <TextField label="Engagement (optional)" value={newTask.engagement} onChange={e => setNewTask(p => ({ ...p, engagement: e.target.value }))} select fullWidth size="small">
            <MenuItem value="">— None —</MenuItem>
            {engagements.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTask} disabled={!newTask.title} sx={{ bgcolor: theme.palette.primary.main }}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Time Slot Request */}
      <Dialog open={reqDlg} onClose={() => setReqDlg(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Testing Time Slot</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Title / Purpose" value={newReq.title} onChange={e => setNewReq(p => ({ ...p, title: e.target.value }))} fullWidth size="small" required />
          <TextField label="Notes" value={newReq.notes} onChange={e => setNewReq(p => ({ ...p, notes: e.target.value }))} fullWidth size="small" multiline rows={3} />
          <TextField label="Engagement" value={newReq.engagement} onChange={e => setNewReq(p => ({ ...p, engagement: e.target.value }))} select fullWidth size="small">
            <MenuItem value="">— None —</MenuItem>
            {engagements.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
          </TextField>
          <Grid container spacing={1}>
            <Grid item xs={6}><TextField label="Preferred Start" type="datetime-local" value={newReq.preferred_start} onChange={e => setNewReq(p => ({ ...p, preferred_start: e.target.value }))} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField label="Preferred End" type="datetime-local" value={newReq.preferred_end} onChange={e => setNewReq(p => ({ ...p, preferred_end: e.target.value }))} fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReqDlg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateReq} disabled={!newReq.title} sx={{ bgcolor: theme.palette.primary.main }}>Submit Request</Button>
        </DialogActions>
      </Dialog>

      {/* ── Event Detail (tabbed: Details | Comments | Handover) ── */}
      <Dialog open={!!detailDlg} onClose={() => setDetailDlg(null)} maxWidth="sm" fullWidth>
        {detailDlg && (
          <>
            <DialogTitle sx={{ pb: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: EVENT_COLORS[detailDlg.event_type] || '#999', flexShrink: 0 }} />
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1, textDecoration: detailDlg.is_completed ? 'line-through' : 'none', color: detailDlg.is_completed ? 'text.disabled' : 'text.primary' }}>
                  {detailDlg.title}
                </Typography>
                {!isClient && (
                  <Tooltip title={detailDlg.is_completed ? 'Mark incomplete' : 'Mark complete'}>
                    <IconButton size="small" onClick={() => handleToggleComplete(detailDlg)}>
                      {detailDlg.is_completed
                        ? <CheckCircle fontSize="small" color="success" />
                        : <RadioButtonUnchecked fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </DialogTitle>

            <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Details" sx={{ minHeight: 40, fontSize: '0.8rem' }} />
              <Tab label={`Comments (${comments.length})`} sx={{ minHeight: 40, fontSize: '0.8rem' }} />
              <Tab label="Handover" icon={<Handshake sx={{ fontSize: 14 }} />} iconPosition="start" sx={{ minHeight: 40, fontSize: '0.8rem' }} />
            </Tabs>

            <DialogContent sx={{ minHeight: 200 }}>
              {/* Details tab */}
              {detailTab === 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{detailDlg.event_type_display || detailDlg.event_type}</Typography>
                  {detailDlg.description && <Typography variant="body2" sx={{ mb: 1 }}>{detailDlg.description}</Typography>}
                  <Typography variant="body2">Start: <strong>{detailDlg.start_date?.slice(0, 16).replace('T', ' ')}</strong></Typography>
                  <Typography variant="body2">End: <strong>{detailDlg.end_date?.slice(0, 16).replace('T', ' ')}</strong></Typography>
                  {detailDlg.location && <Typography variant="body2">Location: <strong>{detailDlg.location}</strong></Typography>}
                  {detailDlg.engagement_name && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Typography variant="body2">Engagement: <strong>{detailDlg.engagement_name}</strong></Typography>
                      {detailDlg.engagement && (
                        <Tooltip title="Open engagement">
                          <IconButton size="small" onClick={() => { setDetailDlg(null); navigate(`/engagements/${detailDlg.engagement}`); }}>
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
                  {detailDlg.attendees_detail?.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" gutterBottom>Attendees:</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {detailDlg.attendees_detail.map(a => (
                          <Chip key={a.id} label={a.name} size="small" avatar={<Avatar sx={{ bgcolor: theme.palette.primary.main, fontSize: '0.6rem' }}>{a.name?.[0]}</Avatar>} />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {detailDlg.created_by_name && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Created by {detailDlg.created_by_name}</Typography>}
                </Box>
              )}

              {/* Comments tab */}
              {detailTab === 1 && (
                <Box>
                  {comments.length === 0
                    ? <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No comments yet. Be the first to add one.</Typography>
                    : (
                      <List dense disablePadding sx={{ mb: 2 }}>
                        {comments.map(c => (
                          <ListItem key={c.id} sx={{ px: 0, alignItems: 'flex-start' }}>
                            <Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: theme.palette.primary.main, fontSize: '0.6rem', mt: 0.3, flexShrink: 0 }}>
                              {c.author_name?.[0]}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight={600}>{c.author_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{new Date(c.created_at).toLocaleString()}</Typography>
                              </Box>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.text}</Typography>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    )
                  }
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <TextField
                      fullWidth multiline rows={2} size="small"
                      placeholder="Add a comment…"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddComment(); }}
                    />
                    <IconButton onClick={handleAddComment} disabled={!commentText.trim() || commentSaving} color="primary">
                      <Send />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary">Ctrl+Enter to send</Typography>
                </Box>
              )}

              {/* Handover tab */}
              {detailTab === 2 && (
                <Box>
                  <Alert severity="info" sx={{ mb: 2, fontSize: '0.78rem' }}>
                    Document test requirements, scope, credentials, and files for tester handover.
                  </Alert>

                  <TextField
                    fullWidth multiline rows={6} size="small"
                    label="Handover Notes"
                    placeholder="Test requirements, login credentials, scope details, in-progress findings, known issues…"
                    value={detailDlg.handover_notes || ''}
                    onChange={e => setDetailDlg(prev => ({ ...prev, handover_notes: e.target.value }))}
                  />
                  <Button variant="contained" size="small" onClick={handleSaveHandover}
                    sx={{ mt: 1, mb: 2, bgcolor: theme.palette.primary.main }}>
                    Save Notes
                  </Button>

                  <Divider sx={{ mb: 1.5 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>Attachments ({attachments.length})</Typography>
                    <Button
                      size="small" startIcon={attUploading ? <CircularProgress size={14} /> : <AttachFile />}
                      variant="outlined" component="label" disabled={attUploading}
                    >
                      Upload File
                      <input type="file" hidden onChange={e => { if (e.target.files[0]) handleUploadAttachment(e.target.files[0]); e.target.value = ''; }} />
                    </Button>
                  </Box>
                  {attachments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>No files attached yet.</Typography>
                  ) : (
                    <List dense disablePadding>
                      {attachments.map(att => (
                        <ListItem key={att.id} sx={{ px: 0, py: 0.25 }}
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Download">
                                <IconButton size="small" component="a" href={att.url} target="_blank" rel="noopener noreferrer">
                                  <Download fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {!isClient && (
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteAttachment(att.id)}>
                                    <DeleteOutline fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 30 }}><AttachFile fontSize="small" /></ListItemIcon>
                          <ListItemText
                            primary={att.filename}
                            secondary={`${(att.file_size / 1024).toFixed(1)} KB · ${att.uploaded_by_name} · ${new Date(att.uploaded_at).toLocaleDateString()}`}
                            primaryTypographyProps={{ fontSize: '0.82rem', noWrap: true }}
                            secondaryTypographyProps={{ fontSize: '0.72rem' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </DialogContent>

            <DialogActions>
              {!isClient && <Button color="error" onClick={() => handleDeleteEvent(detailDlg.id)}>Delete</Button>}
              <Button onClick={() => setDetailDlg(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Engagement / Project Popup ── */}
      <Dialog open={!!engDlg} onClose={() => { setEngDlg(null); setEngDlgMember(null); }} maxWidth="sm" fullWidth>
        {engDlg && (
          <>
            <DialogTitle sx={{ pb: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: (ENG_STATUS[engDlg.status] || ENG_STATUS.PLANNING).border, flexShrink: 0 }} />
                <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>{engDlg.name}</Typography>
                <Chip label={(ENG_STATUS[engDlg.status] || ENG_STATUS.PLANNING).label} size="small"
                  sx={{ bgcolor: (ENG_STATUS[engDlg.status] || ENG_STATUS.PLANNING).bg, color: (ENG_STATUS[engDlg.status] || ENG_STATUS.PLANNING).text, border: `1px solid ${(ENG_STATUS[engDlg.status] || ENG_STATUS.PLANNING).border}`, fontWeight: 700 }} />
              </Box>
            </DialogTitle>

            <Tabs value={engNotesTab} onChange={(_, v) => setEngNotesTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Overview" sx={{ minHeight: 40, fontSize: '0.8rem' }} />
              <Tab label="Handover Notes" icon={<Handshake sx={{ fontSize: 14 }} />} iconPosition="start" sx={{ minHeight: 40, fontSize: '0.8rem' }} />
            </Tabs>

            <DialogContent>
              {engNotesTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
                  <Grid container spacing={1.5}>
                    {engDlg.start_date && <Grid item xs={6}><Typography variant="caption" color="text.secondary" fontWeight={700}>START</Typography><Typography variant="body2" fontWeight={600}>{engDlg.start_date}</Typography></Grid>}
                    {engDlg.end_date && <Grid item xs={6}><Typography variant="caption" color="text.secondary" fontWeight={700}>END</Typography><Typography variant="body2" fontWeight={600}>{engDlg.end_date}</Typography></Grid>}
                    {engDlg.report_due_date && <Grid item xs={6}><Typography variant="caption" color="text.secondary" fontWeight={700}>REPORT DUE</Typography><Typography variant="body2" fontWeight={600} sx={{ color: '#8e44ad' }}>{engDlg.report_due_date}</Typography></Grid>}
                    {engDlg.engagement_type && <Grid item xs={6}><Typography variant="caption" color="text.secondary" fontWeight={700}>TYPE</Typography><Typography variant="body2" fontWeight={600}>{engDlg.engagement_type_display || engDlg.engagement_type}</Typography></Grid>}
                    {isAdmin && (
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <WeekendOutlined sx={{ fontSize: 18, color: engDlg.skip_weekends ? '#e65100' : 'text.disabled' }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary">SKIP WEEKENDS</Typography>
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              {engDlg.skip_weekends ? 'Weekends excluded — duration counts working days only' : 'Weekends included in duration'}
                            </Typography>
                          </Box>
                          <Switch
                            size="small"
                            checked={!!engDlg.skip_weekends}
                            onChange={async (e) => {
                              const newVal = e.target.checked;
                              try {
                                const patchData = { skip_weekends: newVal };
                                if (newVal && engDlg.start_date && engDlg.end_date) {
                                  // Extend end_date so the calendar-day span becomes a working-day span.
                                  // e.g. Mon–Sun (7 cal days) → Mon–Tue next week (7 working days).
                                  const start = dayjs(engDlg.start_date);
                                  const calDayCount = dayjs(engDlg.end_date).diff(start, 'day'); // exclusive count
                                  let d = start;
                                  let remaining = calDayCount;
                                  while (remaining > 0) {
                                    d = d.add(1, 'day');
                                    if (d.day() !== 0 && d.day() !== 6) remaining--;
                                  }
                                  patchData.end_date = d.format('YYYY-MM-DD');
                                }
                                await api.patch(`/engagements/${engDlg.id}/`, patchData);
                                const newEnd = patchData.end_date || engDlg.end_date;
                                setEngDlg(prev => ({ ...prev, skip_weekends: newVal, end_date: newEnd }));
                                setEngagements(prev => prev.map(en =>
                                  en.id === engDlg.id ? { ...en, skip_weekends: newVal, end_date: newEnd } : en
                                ));
                                setSnack(`"${engDlg.name}" ${newVal ? 'now skips weekends — end date adjusted' : 'now includes weekends'}`);
                              } catch (err) { console.error(err); }
                            }}
                          />
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                  {engDlg.lead_pentester_name && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>LEAD TESTER</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: theme.palette.primary.main, fontSize: '0.65rem' }}>{engDlg.lead_pentester_name[0]}</Avatar>
                        <Typography variant="body2" fontWeight={600}>{engDlg.lead_pentester_name}</Typography>
                      </Box>
                    </Box>
                  )}
                  {engDlg.team_members_details?.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>TEAM</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {engDlg.team_members_details.map(m => (
                          <Chip key={m.id} size="small" label={`${m.first_name} ${m.last_name}`}
                            avatar={<Avatar sx={{ bgcolor: theme.palette.primary.main, fontSize: '0.55rem' }}>{m.first_name?.[0]}</Avatar>} />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {engDlg.scope && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>SCOPE</Typography>
                      <Typography variant="body2" sx={{ mt: 0.3, whiteSpace: 'pre-wrap' }}>{engDlg.scope}</Typography>
                    </Box>
                  )}
                  {engDlg.description && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>DESCRIPTION</Typography>
                      <Typography variant="body2" sx={{ mt: 0.3 }}>{engDlg.description}</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {engNotesTab === 1 && (
                <Box sx={{ pt: 1 }}>
                  <Alert severity="info" sx={{ mb: 2, fontSize: '0.78rem' }}>
                    Store test requirements, credentials, scope notes and instructions for handover to another tester.
                  </Alert>
                  <TextField
                    fullWidth multiline rows={8} size="small"
                    label="Handover Notes"
                    placeholder="Test environment details, login credentials, in-scope IP ranges, vulnerabilities already found, special instructions…"
                    value={engNotes}
                    onChange={e => setEngNotes(e.target.value)}
                  />
                  <Button variant="contained" size="small" sx={{ mt: 1.5, bgcolor: theme.palette.primary.main }}
                    onClick={async () => {
                      try {
                        await api.patch(`/engagements/${engDlg.id}/`, { description: engNotes });
                        setEngDlg(prev => ({ ...prev, description: engNotes }));
                      } catch (e) { console.error(e); }
                    }}>
                    Save Handover Notes
                  </Button>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button onClick={() => { setEngDlg(null); setEngDlgMember(null); }}>Close</Button>
                {engDlgMember && isAdmin && (
                  <Button color="error" startIcon={<DeleteOutline />}
                    onClick={() => handleRemoveFromEngagement(engDlg, engDlgMember)}>
                    Unassign from project
                  </Button>
                )}
              </Box>
              <Button variant="contained" endIcon={<OpenInNew />} sx={{ bgcolor: theme.palette.primary.main }}
                onClick={() => { setEngDlg(null); setEngDlgMember(null); navigate(`/engagements/${engDlg.id}`); }}>
                Open Project
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── GRC Reassign Confirmation ── */}
      <Dialog open={!!grcReassignDlg} onClose={() => { setGrcReassignDlg(null); setGrcReassignMode('replace'); setDragGrcAssessment(null); dragGrcRef.current = null; setDragSourceMember(null); }} maxWidth="xs" fullWidth>
        {grcReassignDlg && (() => {
          const { assessment, targetMember, sourceMember, targetDay } = grcReassignDlg;
          const roleMismatch = targetMember.role && targetMember.role !== 'GRC_CONSULTANT' && targetMember.role !== 'ADMIN';
          return (
            <>
              <DialogTitle>Reassign GRC Assessment</DialogTitle>
              <DialogContent>
                <Typography variant="body2">
                  Move <strong>{assessment.title}</strong> from{' '}
                  <strong>{sourceMember?.first_name} {sourceMember?.last_name}</strong> to{' '}
                  <strong>{targetMember.first_name} {targetMember.last_name}</strong>?
                </Typography>
                {roleMismatch && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fff3e0', border: '1px solid #ff980050', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 600 }}>
                      ⚠️ Role mismatch
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#e65100' }}>
                      {targetMember.first_name} {targetMember.last_name} is a <strong>{targetMember.role_display || targetMember.role}</strong>, not a GRC Consultant. Make sure this assignment is intentional before confirming.
                    </Typography>
                  </Box>
                )}
                {targetDay && (() => {
                  const newStart = targetDay.format('YYYY-MM-DD');
                  const duration = assessment.start_date && assessment.end_date ? dayjs(assessment.end_date).diff(dayjs(assessment.start_date), 'day') : 0;
                  const newEnd = targetDay.add(duration, 'day').format('YYYY-MM-DD');
                  return (
                    <Box sx={{ mt: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block" fontWeight={700}>RESCHEDULED TO</Typography>
                      <Typography variant="body2" fontWeight={600}>{newStart} → {newEnd}</Typography>
                    </Box>
                  );
                })()}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Choose whether to replace the lead consultant or add this person as the assessor.
              </Typography>
              <ToggleButtonGroup
                value={grcReassignMode}
                exclusive
                onChange={(_, v) => v && setGrcReassignMode(v)}
                size="small"
                sx={{ mt: 1 }}
              >
                <ToggleButton value="replace">Replace {sourceMember?.first_name} as lead consultant</ToggleButton>
                <ToggleButton value="add">Add {targetMember.first_name} as assessor (keep lead)</ToggleButton>
              </ToggleButtonGroup>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => { setGrcReassignDlg(null); setGrcReassignMode('replace'); setDragGrcAssessment(null); dragGrcRef.current = null; setDragSourceMember(null); }}>Cancel</Button>
                <Button variant="contained" color={roleMismatch ? 'warning' : 'primary'} onClick={handleGrcReassign}>
                  {grcReassignMode === 'add' ? 'Add as Assessor' : 'Reassign'}
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* ── Reassign Confirmation ── */}
      <Dialog open={!!reassignDlg} onClose={() => { setReassignDlg(null); setDragEng(null); setReassignMode('replace'); }} maxWidth="xs" fullWidth>
        {reassignDlg && (() => {
          const penRoleMismatch = reassignDlg.targetMember.role && reassignDlg.targetMember.role !== 'PENTESTER' && reassignDlg.targetMember.role !== 'ADMIN';
          return (
          <>
            <DialogTitle>Reassign Engagement</DialogTitle>
            <DialogContent>
              <Typography variant="body2">
                Move <strong>{reassignDlg.engagement.name}</strong> from{' '}
                <strong>{reassignDlg.sourceMember?.first_name} {reassignDlg.sourceMember?.last_name}</strong> to{' '}
                <strong>{reassignDlg.targetMember.first_name} {reassignDlg.targetMember.last_name}</strong>?
              </Typography>
              {penRoleMismatch && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fff3e0', border: '1px solid #ff980050', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 600 }}>
                    ⚠️ Role mismatch
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#e65100' }}>
                    {reassignDlg.targetMember.first_name} {reassignDlg.targetMember.last_name} is a <strong>{reassignDlg.targetMember.role_display || reassignDlg.targetMember.role}</strong>, not a Penetration Tester. Make sure this assignment is intentional before confirming.
                  </Typography>
                </Box>
              )}
              {reassignDlg.targetDay && (() => {
                const { new_start_date, new_end_date } = shiftEngagementDates(reassignDlg.engagement, reassignDlg.targetDay);
                return (
                  <Box sx={{ mt: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" fontWeight={700}>RESCHEDULED TO</Typography>
                    <Typography variant="body2" fontWeight={600}>{new_start_date} → {new_end_date}</Typography>
                    {reassignDlg.engagement.skip_weekends && (
                      <Typography variant="caption" color="text.secondary">Weekends excluded from duration</Typography>
                    )}
                  </Box>
                );
              })()}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Source member will be removed from this engagement.
              </Typography>
              <ToggleButtonGroup
                value={reassignMode}
                exclusive
                onChange={(_, v) => v && setReassignMode(v)}
                size="small"
                sx={{ mt: 1 }}
              >
                <ToggleButton value="replace">Replace {reassignDlg.sourceMember?.first_name} as lead</ToggleButton>
                <ToggleButton value="add">Add {reassignDlg.targetMember.first_name} to team (keep lead)</ToggleButton>
              </ToggleButtonGroup>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setReassignDlg(null); setDragEng(null); setReassignMode('replace'); }}>Cancel</Button>
              <Button variant="contained"
                onClick={reassignMode === 'add' ? handleAddToTeam : handleReassign}
                sx={{ bgcolor: theme.palette.primary.main }}>
                {reassignMode === 'add' ? 'Add to Team' : 'Reassign'}
              </Button>
            </DialogActions>
          </>
          );
        })()}
      </Dialog>

      {/* ── Task Detail / Edit Dialog ── */}
      <Dialog open={!!taskDetail} onClose={() => setTaskDetail(null)} maxWidth="sm" fullWidth>
        {taskDetail && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: PRIORITY_COLORS[taskDetail.priority] || '#7f8c8d', flexShrink: 0 }} />
                <Typography variant="h6" fontWeight={700} sx={{ flex: 1, fontSize: '1rem' }}>Task Details</Typography>
                <Chip label={colLabel(taskDetail.status, TASK_STATUSES.find(s => s.value === taskDetail.status)?.label || taskDetail.status)}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: `${TASK_STATUS_COLORS[taskDetail.status]}18`, color: TASK_STATUS_COLORS[taskDetail.status], border: `1px solid ${TASK_STATUS_COLORS[taskDetail.status]}50` }} />
              </Box>

              {/* Status progression bar */}
              <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5 }}>
                {TASK_STATUSES.map(s => (
                  <Box key={s.value} onClick={() => setTaskDetail(p => ({ ...p, status: s.value }))}
                    sx={{
                      flex: 1, height: 6, borderRadius: 1, cursor: 'pointer',
                      bgcolor: taskDetail.status === s.value ? s.color : `${s.color}25`,
                      border: `1px solid ${s.color}40`,
                      '&:hover': { bgcolor: `${s.color}70` },
                      transition: 'background 0.15s',
                    }} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                {TASK_STATUSES.map(s => (
                  <Typography key={s.value} variant="caption"
                    sx={{ flex: 1, textAlign: 'center', fontSize: '0.55rem', color: taskDetail.status === s.value ? s.color : 'text.disabled', fontWeight: taskDetail.status === s.value ? 700 : 400 }}>
                    {colLabel(s.value, s.label)}
                  </Typography>
                ))}
              </Box>
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Title" value={taskDetail.title} fullWidth size="small" required
                onChange={e => setTaskDetail(p => ({ ...p, title: e.target.value }))} />
              <TextField label="Description" value={taskDetail.description || ''} fullWidth size="small" multiline rows={3}
                placeholder="Add context, acceptance criteria, or notes…"
                onChange={e => setTaskDetail(p => ({ ...p, description: e.target.value }))} />

              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField label="Priority" value={taskDetail.priority} fullWidth size="small" select
                    onChange={e => setTaskDetail(p => ({ ...p, priority: e.target.value }))}>
                    {PRIORITIES.map(p => (
                      <MenuItem key={p.value} value={p.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                          {p.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Status" value={taskDetail.status} fullWidth size="small" select
                    onChange={e => setTaskDetail(p => ({ ...p, status: e.target.value }))}>
                    {TASK_STATUSES.map(s => (
                      <MenuItem key={s.value} value={s.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                          {colLabel(s.value, s.label)}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Assigned To" value={taskDetail.assigned_to || ''} fullWidth size="small" select
                    onChange={e => setTaskDetail(p => ({ ...p, assigned_to: e.target.value || null }))}>
                    <MenuItem value="">— Unassigned —</MenuItem>
                    {members.map(m => (
                      <MenuItem key={m.id} value={m.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 20, height: 20, fontSize: '0.6rem', bgcolor: theme.palette.primary.main }}>{m.first_name?.[0]}{m.last_name?.[0]}</Avatar>
                          {m.first_name} {m.last_name}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Due Date" type="date" value={taskDetail.due_date || ''} fullWidth size="small"
                    InputLabelProps={{ shrink: true }}
                    onChange={e => setTaskDetail(p => ({ ...p, due_date: e.target.value }))} />
                </Grid>
              </Grid>

              <TextField label="Linked Engagement (optional)" value={taskDetail.engagement || ''} fullWidth size="small" select
                onChange={e => setTaskDetail(p => ({ ...p, engagement: e.target.value || null }))}>
                <MenuItem value="">— None —</MenuItem>
                {engagements.map(e => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
              </TextField>

              {(taskDetail.created_by_name || taskDetail.created_at) && (
                <Typography variant="caption" color="text.secondary">
                  Created{taskDetail.created_by_name ? ` by ${taskDetail.created_by_name}` : ''}{taskDetail.created_at ? ` · ${new Date(taskDetail.created_at).toLocaleDateString()}` : ''}
                </Typography>
              )}
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
              <Button color="error" startIcon={<DeleteOutline />} onClick={() => handleDeleteTask(taskDetail.id)}>Delete</Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setTaskDetail(null)}>Cancel</Button>
                <Button variant="contained" sx={{ bgcolor: theme.palette.primary.main }}
                  onClick={() => {
                    handleUpdateTask(taskDetail.id, {
                      title: taskDetail.title,
                      description: taskDetail.description,
                      priority: taskDetail.priority,
                      status: taskDetail.status,
                      assigned_to: taskDetail.assigned_to || null,
                      due_date: taskDetail.due_date || null,
                      engagement: taskDetail.engagement || null,
                    });
                    setTaskDetail(null);
                  }}>
                  Save Changes
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

    </Box>
  );
}
