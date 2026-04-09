import { useRef } from 'react';
import Konva from 'konva';
import { Toolbar } from './components/Toolbar/Toolbar';
import { ObjectStrip } from './components/StampLibrary/ObjectStrip';
import { EditorCanvas } from './components/Canvas/EditorCanvas';
import { PlanViewCanvas } from './components/PlanView/PlanViewCanvas';
import { ToolsSidebar } from './components/GestureControls/ToolsSidebar';
import { useProjectStore } from './store/useProjectStore';

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const viewMode = useProjectStore((s) => s.viewMode);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 overflow-hidden fixed inset-0">
      <Toolbar stageRef={stageRef} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ToolsSidebar />
        <div className="flex-1 min-w-0 relative">
          {viewMode === 'photo' ? (
            <EditorCanvas stageRef={stageRef} />
          ) : (
            <PlanViewCanvas />
          )}
        </div>
        <ObjectStrip />
      </div>
    </div>
  );
}
