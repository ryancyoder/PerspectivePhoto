import { useRef } from 'react';
import Konva from 'konva';
import { Toolbar } from './components/Toolbar/Toolbar';
import { StampLibrary } from './components/StampLibrary/StampLibrary';
import { EditorCanvas } from './components/Canvas/EditorCanvas';
import { PlanViewCanvas } from './components/PlanView/PlanViewCanvas';
import { SizeSlider } from './components/GestureControls/SizeSlider';
import { MovementJoystick } from './components/GestureControls/MovementJoystick';
import { PointMatcher } from './components/PlanView/PointMatcher';
import { useProjectStore } from './store/useProjectStore';

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const viewMode = useProjectStore((s) => s.viewMode);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 overflow-hidden fixed inset-0">
      <Toolbar stageRef={stageRef} />
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        <StampLibrary />
        {viewMode === 'photo' ? (
          <EditorCanvas stageRef={stageRef} />
        ) : (
          <PlanViewCanvas />
        )}
        <SizeSlider />
        <MovementJoystick />
        <PointMatcher />
      </div>
    </div>
  );
}
