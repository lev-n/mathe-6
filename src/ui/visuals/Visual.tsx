import type { Visual } from '../../core/types';
import PlaceValueVisual from './PlaceValueVisual';
import NumberLineVisual from './NumberLineVisual';
import WrittenVisual from './WrittenVisual';
import NetVisual from './NetVisual';
import ContainerVisual from './ContainerVisual';
import GridVisual from './GridVisual';
import ShapeVisual from './ShapeVisual';
import CubeBuildingVisual from './CubeBuildingVisual';
import BarChartVisual from './BarChartVisual';
import TallyVisual from './TallyVisual';
import TableVisual from './TableVisual';
import RulerVisual from './RulerVisual';
import CoordinateGridVisual from './CoordinateGridVisual';
import AngleVisual from './AngleVisual';
import FractionModelVisual from './FractionModelVisual';
import QuaderVisual from './QuaderVisual';
import TermVisual from './TermVisual';
import LinesVisual from './LinesVisual';
import ThermometerVisual from './ThermometerVisual';
import PercentBarVisual from './PercentBarVisual';
import FigureVisual from './FigureVisual';
import PieChartVisual from './PieChartVisual';
import BagVisual from './BagVisual';
import DiceVisual from './DiceVisual';
import SpinnerVisual from './SpinnerVisual';

/** Dispatches a declarative Visual to its SVG/HTML renderer. */
export default function VisualView({ visual, print }: { visual: Visual; print?: boolean }) {
  switch (visual.type) {
    case 'placeValue':
      return <PlaceValueVisual visual={visual} print={print} />;
    case 'numberLine':
      return <NumberLineVisual visual={visual} print={print} />;
    case 'written':
      return <WrittenVisual visual={visual} print={print} />;
    case 'net':
      return <NetVisual visual={visual} print={print} />;
    case 'container':
      return <ContainerVisual visual={visual} print={print} />;
    case 'grid':
      return <GridVisual visual={visual} print={print} />;
    case 'shape':
      return <ShapeVisual visual={visual} print={print} />;
    case 'cubeBuilding':
      return <CubeBuildingVisual visual={visual} print={print} />;
    case 'barChart':
      return <BarChartVisual visual={visual} print={print} />;
    case 'tally':
      return <TallyVisual visual={visual} print={print} />;
    case 'table':
      return <TableVisual visual={visual} print={print} />;
    case 'ruler':
      return <RulerVisual visual={visual} print={print} />;
    case 'coordinateGrid':
      return <CoordinateGridVisual visual={visual} print={print} />;
    case 'angle':
      return <AngleVisual visual={visual} print={print} />;
    case 'fractionModel':
      return <FractionModelVisual visual={visual} print={print} />;
    case 'quader':
      return <QuaderVisual visual={visual} print={print} />;
    case 'term':
      return <TermVisual visual={visual} print={print} />;
    case 'lines':
      return <LinesVisual visual={visual} print={print} />;
    case 'thermometer':
      return <ThermometerVisual visual={visual} print={print} />;
    case 'percentBar':
      return <PercentBarVisual visual={visual} print={print} />;
    case 'figure':
      return <FigureVisual visual={visual} print={print} />;
    case 'pieChart':
      return <PieChartVisual visual={visual} print={print} />;
    case 'bag':
      return <BagVisual visual={visual} print={print} />;
    case 'dice':
      return <DiceVisual visual={visual} print={print} />;
    case 'spinner':
      return <SpinnerVisual visual={visual} print={print} />;
  }
}
