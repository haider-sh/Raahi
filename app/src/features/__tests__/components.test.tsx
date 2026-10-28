import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { RouteDetailBody } from '@/features/routes/route-detail-body';
import { StopRoutesList } from '@/features/routes/stop-routes-list';
import { PlanError } from '@/features/trips/plan-error';
import { TripOptionCard } from '@/features/trips/trip-option-card';
import { buildSteps, TripSteps } from '@/features/trips/trip-steps';
import i18n from '@/i18n';
import { ApiError } from '@/services/api/errors';
import { devToggles } from '@/services/api/mock/dev-toggles';
import { MockRaahiApi } from '@/services/api/mock/mock-api';
import type { TripOption } from '@/services/api/types';

const api = new MockRaahiApi();
const at = (id: string) => api.network.stops.get(id)!.location;

let direct: TripOption;
let transfer: TripOption;

beforeAll(async () => {
  devToggles.latency = false;
  direct = (await api.plan({ from: at('s_nagan'), to: at('s_saddar'), maxTransfers: 1 })).options[0];
  transfer = (await api.plan({ from: at('s_sohrab_goth'), to: at('s_teen_talwar'), maxTransfers: 1 })).options.find(
    (o) => o.transfers === 1,
  )!;
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('TripOptionCard', () => {
  it('renders a direct option in English', async () => {
    await render(<TripOptionCard trip={direct} onPress={() => {}} />);
    expect(screen.getByText('W18')).toBeTruthy();
    expect(screen.getByText('Direct')).toBeTruthy();
    expect(screen.getByText(/towards Tower/)).toBeTruthy();
  });

  it('renders a transfer option with the change stop in English', async () => {
    await render(<TripOptionCard trip={transfer} onPress={() => {}} />);
    expect(screen.getByText('Sheraz')).toBeTruthy();
    expect(screen.getByText('Masood')).toBeTruthy();
    expect(screen.getByText('1 change at Gurumandir')).toBeTruthy();
  });

  it('renders both options in Urdu', async () => {
    await i18n.changeLanguage('ur');
    const { unmount } = await render(<TripOptionCard trip={direct} onPress={() => {}} />);
    expect(screen.getByText('سیدھی بس')).toBeTruthy();
    expect(screen.getByText(/ٹاور کی طرف/)).toBeTruthy();
    await unmount();
    await render(<TripOptionCard trip={transfer} onPress={() => {}} />);
    expect(screen.getByText('گرومندر پر بس بدلیں')).toBeTruthy();
  });
});

describe('PlanError', () => {
  const noop = () => {};
  const nearby = [{ stop: api.network.stops.get('s_saddar')!, distanceM: 120, routes: [] }];

  it.each([
    [new ApiError('NO_STOPS_NEARBY', 422), [], 'No bus stop within walking distance of your start.'],
    [new ApiError('NO_STOPS_NEARBY', 422), nearby, 'No bus stop within walking distance of your destination.'],
    [new ApiError('NO_ROUTE', 422), nearby, "We don't know a bus for this trip yet."],
    [new ApiError('NETWORK', 0), [], 'No connection. Your saved trips and buses still work.'],
    [new Error('boom'), [], 'Something went wrong.'],
  ])('shows the right message for %s', async (error, nearFrom, message) => {
    await render(<PlanError error={error} nearFrom={nearFrom} nearTo={[]} onMovePin={noop} onRetry={noop} />);
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('offers to move the pin for the end with no stops', async () => {
    const onMovePin = jest.fn();
    await render(
      <PlanError error={new ApiError('NO_STOPS_NEARBY', 422)} nearFrom={[]} onMovePin={onMovePin} onRetry={() => {}} />,
    );
    await fireEvent.press(screen.getByText('Move the pin'));
    expect(onMovePin).toHaveBeenCalledWith('from');
  });
});

describe('TripSteps', () => {
  it('orders the steps of a transfer trip: walk?, board, ride, get off, board, ride, get off, walk?', async () => {
    const kinds = buildSteps(transfer)
      .map((s) => s.kind)
      .filter((k) => k !== 'walk');
    expect(kinds).toEqual(['board', 'ride', 'alight', 'board', 'ride', 'alight']);
  });

  it('highlights the final get-off stop and the stop before it', async () => {
    await render(<TripSteps trip={direct} />);
    const alight = screen.getByTestId('get-off-highlight');
    expect(within(alight).getByText('Get off at Saddar')).toBeTruthy();
    expect(within(alight).getByText('Get ready after Numaish')).toBeTruthy();
  });

  it('shows the board step with direction and the conductor tip', async () => {
    await render(<TripSteps trip={direct} />);
    expect(screen.getByText('towards Tower')).toBeTruthy();
    expect(screen.getByText('Ask the conductor: “Tower jayegi?”')).toBeTruthy();
  });

  it('expands the stop list', async () => {
    await render(<TripSteps trip={direct} />);
    expect(screen.queryByTestId('ride-stops')).toBeNull();
    await fireEvent.press(screen.getByText('Show all stops'));
    const list = screen.getByTestId('ride-stops');
    expect(within(list).getByText('• Hyderi')).toBeTruthy();
  });
});

describe('route and stop lookup', () => {
  it('lists stops in reverse order after toggling direction', async () => {
    const detail = await api.getRoute('r_w18');
    const names = () =>
      within(screen.getByTestId('route-stops'))
        .getAllByTestId('route-stop-name')
        .map((n) => n.props.children);

    let index = 0;
    const { rerender } = await render(
      <RouteDetailBody
        detail={detail}
        variantIndex={index}
        onVariantChange={(i) => (index = i)}
        onStopPress={() => {}}
        color="#000"
      />,
    );
    const forward = names();
    await fireEvent.press(screen.getByText('towards Power House Chowrangi'));
    await rerender(
      <RouteDetailBody
        detail={detail}
        variantIndex={index}
        onVariantChange={(i) => (index = i)}
        onStopPress={() => {}}
        color="#000"
      />,
    );
    expect(index).toBe(1);
    expect(names()).toEqual([...forward].reverse());
  });

  it('shows a two-way route twice on the stop screen, once per direction', async () => {
    const { routes } = await api.getStop('s_nagan');
    await render(<StopRoutesList routes={routes} onPress={() => {}} />);
    expect(screen.getAllByText('W18')).toHaveLength(2);
    expect(screen.getByText('towards Tower')).toBeTruthy();
    expect(screen.getByText('towards Power House Chowrangi')).toBeTruthy();
  });
});
