# Drag-and-Drop & Calendar View Features

## 🎯 Overview

The Resource Allocation app now includes enhanced drag-and-drop functionality in the Matrix View and a new Calendar View for better resource management and visualization.

## ✅ Matrix View Enhancements

### Drag-and-Drop Functionality

**Features:**
- **Drag allocations between weeks**: Move allocation values from one week to another within the same row (resource + project + workType)
- **Visual feedback**: Highlight target weeks during drag operations
- **Overbooking prevention**: Automatically prevents moves that would cause overbooking (>5 days)
- **Merge functionality**: If target week has an existing allocation, values are merged
- **Toast notifications**: Success, error, and warning messages for all operations

**How to use:**
1. Hover over any cell with a value > 0
2. Cursor changes to grab/grabbing to indicate draggable content
3. Click and drag the value to another week column
4. Drop to move the allocation
5. Toast notifications confirm the action

**Technical Implementation:**
- Uses `@dnd-kit/core` for robust drag-and-drop functionality
- `PointerSensor` with 8px activation constraint for better UX
- Real-time overbooking validation
- API integration for immediate data persistence

### UX Improvements

**Visual Feedback:**
- Drag overlay shows allocation details while dragging
- Target week highlighting with blue border and background
- Cursor states: grab (hoverable), grabbing (active drag)
- Tooltips on hover: "Drag to move allocation to another week"

**Toast Notifications:**
- Success: "Moved X days to [date]" or "Merged X days into existing allocation"
- Error: "Moving would cause overbooking" or "Failed to move allocation"
- Duration: 2-4 seconds with appropriate styling

## 📅 Calendar View

### New Page: `/calendar`

**Features:**
- **Resource-focused layout**: Y-axis shows resources, X-axis shows weeks
- **Allocation blocks**: Each allocation displayed as a colored block
- **Color coding**: Blocks colored by work type
- **Drag-and-drop**: Move allocation blocks between weeks
- **Click to view details**: Modal with full allocation information
- **Overbooking indicators**: Red background for overbooked weeks

### Calendar Layout

**Grid Structure:**
- Sticky resource names on the left
- Week headers at the top
- Allocation blocks in week cells
- Responsive design with horizontal scrolling

**Allocation Blocks:**
- Show project name and work type
- Display days allocated
- Color-coded by work type
- Hover effects and shadows
- Click to open detail modal

### Interactions

**Drag-and-Drop:**
- Drag allocation blocks horizontally between weeks
- Same overbooking prevention as Matrix View
- Visual feedback during drag operations
- Toast notifications for all actions

**Detail Modal:**
- Click any allocation block to view details
- Shows: Resource, Project, Work Type, Week, Days, Notes
- Close button to dismiss

## 🔧 Technical Implementation

### Dependencies Added

```json
{
  "@dnd-kit/core": "^6.0.0",
  "@dnd-kit/sortable": "^7.0.0", 
  "@dnd-kit/utilities": "^3.2.0",
  "react-hot-toast": "^2.4.0"
}
```

### Key Components

**MatrixTable.tsx:**
- Enhanced with DndContext wrapper
- Drag event handlers for start, end, and over
- Overbooking validation logic
- Toast integration for user feedback

**CalendarView.tsx:**
- New component for calendar layout
- Resource grouping and week mapping
- Allocation block rendering
- Modal for allocation details

**Layout.tsx:**
- Added Toaster component for notifications
- Configured toast styling and positioning

### API Integration

**Drag Operations:**
- PATCH `/api/allocations/{id}` to update weekStart
- DELETE `/api/allocations/{id}` for merge operations
- Automatic data refresh after operations

**Validation:**
- Client-side overbooking checks
- Server-side validation via existing API
- Error handling with user feedback

## 🎨 UI/UX Enhancements

### Navigation

**Header Component:**
- Added navigation tabs for Matrix and Calendar views
- Active state highlighting
- Smooth transitions between views

### Responsive Design

**Matrix View:**
- Horizontal scrolling for many weeks
- Sticky resource column
- Mobile-friendly touch interactions

**Calendar View:**
- Responsive grid layout
- Horizontal scrolling for week columns
- Touch-friendly drag operations

### Visual Consistency

**Color Scheme:**
- Consistent blue theme for interactions
- Red highlighting for overbooking
- Work type colors for allocation blocks
- Gray tones for inactive states

## 🚀 Usage Guide

### Matrix View

1. **Edit Allocations**: Click any cell to edit days allocated
2. **Drag Allocations**: Drag values between weeks to move allocations
3. **Filter Data**: Use filters to focus on specific resources/projects
4. **View Totals**: See row and column totals for overview

### Calendar View

1. **Navigate**: Use header tabs to switch between views
2. **View Allocations**: See all allocations as colored blocks
3. **Drag Blocks**: Drag allocation blocks between weeks
4. **View Details**: Click blocks to see full allocation information
5. **Filter**: Use same filters as Matrix View

### Best Practices

1. **Overbooking**: System prevents overbooking automatically
2. **Data Refresh**: Changes are saved immediately
3. **Error Handling**: Toast notifications inform of any issues
4. **Undo**: Currently no undo feature (future enhancement)

## 🔮 Future Enhancements

### Planned Features

1. **Undo/Redo**: Add undo functionality for drag operations
2. **Bulk Operations**: Select multiple allocations for batch moves
3. **Timeline View**: Add timeline visualization option
4. **Export**: PDF/Excel export of calendar view
5. **Advanced Filters**: Date range and custom filters
6. **Keyboard Shortcuts**: Keyboard navigation and shortcuts

### Performance Optimizations

1. **Virtual Scrolling**: For large datasets
2. **Lazy Loading**: Load weeks on demand
3. **Caching**: Optimize API calls with better caching
4. **Debouncing**: Reduce API calls during rapid interactions

## 🐛 Known Issues

1. **Color Classes**: Dynamic Tailwind classes may not work in production
2. **Touch Devices**: Drag operations may need optimization for mobile
3. **Large Datasets**: Performance may degrade with many allocations
4. **Browser Compatibility**: Tested on modern browsers only

## 📝 Development Notes

### Code Structure

- **Separation of Concerns**: Drag logic separated from display logic
- **Type Safety**: Full TypeScript implementation
- **Error Boundaries**: Proper error handling throughout
- **Accessibility**: ARIA labels and keyboard navigation support

### Testing Considerations

- **Drag Operations**: Test various drag scenarios
- **Edge Cases**: Empty weeks, overbooking, invalid drops
- **Mobile Testing**: Touch interactions on mobile devices
- **Performance**: Large dataset handling

### Deployment

- **Build Process**: No additional build steps required
- **Environment Variables**: No new environment variables needed
- **Dependencies**: All new dependencies are production-ready 