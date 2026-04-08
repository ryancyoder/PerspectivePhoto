import { useRef } from 'react';
import Konva from 'konva';
import { Toolbar } from './components/Toolbar/Toolbar';
import { StampLibrary } from './components/StampLibrary/StampLibrary';
import { EditorCanvas } from './components/Canvas/EditorCanvas';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { SizeSlider } from './components/GestureControls/SizeSlider';
import { MovementJoystick } from './components/GestureControls/MovementJoystick';

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      <Toolbar stageRef={stageRef} />
      <div className="flex flex-1 min-h-0 relative">
        <StampLibrary />
        <div className="flex-1 relative">
          <EditorCanvas stageRef={stageRef} />
          <SizeSlider />
          <MovementJoystick />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
