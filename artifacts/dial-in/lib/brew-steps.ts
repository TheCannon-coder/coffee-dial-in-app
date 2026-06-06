export type BrewStep = {
  title: string;
  instruction: string;
  duration: number;
};

export const BREW_STEPS: Record<string, BrewStep[]> = {
  'V60': [
    { title: 'Heat water', instruction: 'Bring water to 93°C. Rinse your V60 filter with hot water, then discard the rinse water.', duration: 0 },
    { title: 'Prep coffee', instruction: 'Add 15g of ground coffee to the filter. Shake gently to level the bed.', duration: 0 },
    { title: 'Bloom', instruction: 'Pour 45ml in a slow spiral from centre out. All grounds should be wet. Watch the coffee puff up.', duration: 45 },
    { title: 'First pour', instruction: 'Continue pouring in slow circles to 150ml total. Keep it gentle and steady.', duration: 45 },
    { title: 'Second pour', instruction: 'Pour to 250ml total. Maintain a consistent, unhurried pace.', duration: 60 },
    { title: 'Draw down', instruction: 'Let the coffee drain fully. It should finish drawing down around 3:00.', duration: 30 },
  ],
  'Pour over': [
    { title: 'Heat water', instruction: 'Heat water to 93°C. Rinse filter and preheat your vessel.', duration: 0 },
    { title: 'Prep coffee', instruction: 'Add 15g of coffee. Give the dripper a gentle shake to level the bed.', duration: 0 },
    { title: 'Bloom', instruction: 'Pour 45ml slowly, wetting all the grounds. You should see the coffee puff up.', duration: 45 },
    { title: 'Main pour', instruction: 'Pour slowly in circles to 250ml total. Take your time — this should take about 2 minutes.', duration: 120 },
    { title: 'Draw down', instruction: 'Allow the coffee to drain fully. Should finish around 3:30.', duration: 30 },
  ],
  'Chemex': [
    { title: 'Heat water', instruction: 'Bring water to 94°C. Open the Chemex filter with 3 layers facing the spout and rinse. Discard rinse water.', duration: 0 },
    { title: 'Prep coffee', instruction: 'Add 42g of coffee, ground slightly coarser than V60.', duration: 0 },
    { title: 'Bloom', instruction: 'Pour 90ml slowly, fully saturating the grounds. Wait — the bloom will be dramatic.', duration: 90 },
    { title: 'First pour', instruction: 'Pour to 300ml in steady circles. Take about 60 seconds.', duration: 60 },
    { title: 'Second pour', instruction: 'Continue pouring to 500ml. Slow and steady.', duration: 60 },
    { title: 'Final pour', instruction: 'Pour to 700ml. Let the Chemex do the rest.', duration: 60 },
    { title: 'Draw down', instruction: 'Let it drain fully. Remove the filter and give the Chemex a gentle swirl before serving.', duration: 0 },
  ],
  'Kalita Wave': [
    { title: 'Heat water', instruction: 'Heat water to 93°C. Rinse the Kalita Wave filter with hot water and discard.', duration: 0 },
    { title: 'Prep coffee', instruction: 'Add 20g of coffee, ground slightly finer than V60.', duration: 0 },
    { title: 'Bloom', instruction: 'Pour 45ml directly to the centre to bloom. All grounds should be saturated.', duration: 45 },
    { title: 'First pour', instruction: 'Pour to 135ml in steady centre pours — avoid the filter edges.', duration: 45 },
    { title: 'Second pour', instruction: 'Continue to 220ml, always pouring to the centre.', duration: 45 },
    { title: 'Final pour', instruction: 'Pour to 320ml. Let it draw down fully — should finish around 3:00.', duration: 45 },
  ],
  'AeroPress': [
    { title: 'Heat water', instruction: 'Heat water to 85°C. Rinse the filter cap and attach it to the chamber.', duration: 0 },
    { title: 'Prep coffee', instruction: 'Set up the AeroPress (inverted or normal) and add 15g of coffee.', duration: 0 },
    { title: 'Pour', instruction: 'Pour 200ml of water over the coffee, filling to the top of the chamber.', duration: 0 },
    { title: 'Stir', instruction: 'Stir gently 10 times with the stirrer or a spoon.', duration: 20 },
    { title: 'Steep', instruction: 'Rest the plunger on top (just resting, not pressing) and wait.', duration: 70 },
    { title: 'Press', instruction: 'Flip onto your cup and press slowly and steadily. This should take about 30 seconds.', duration: 30 },
  ],
  'French press': [
    { title: 'Heat water', instruction: 'Bring water to 95°C. Rinse the French press with hot water to preheat it, then discard.', duration: 0 },
    { title: 'Add coffee', instruction: 'Add 30g of coarsely ground coffee to the press.', duration: 0 },
    { title: 'Pour & stir', instruction: 'Pour 500ml of water, making sure all grounds are saturated. Stir gently.', duration: 30 },
    { title: 'Steep', instruction: 'Place the lid on with the plunger up. Let the coffee steep undisturbed.', duration: 210 },
    { title: 'Press', instruction: "Press the plunger down slowly and steadily. If it's very hard, your grind may be too fine.", duration: 30 },
    { title: 'Pour now', instruction: "Pour straight away — leaving coffee in contact with grounds over-extracts it.", duration: 0 },
  ],
  'Espresso': [
    { title: 'Preheat', instruction: 'Allow your machine to heat up fully. Run a blank shot to heat the group head and portafilter.', duration: 0 },
    { title: 'Dose', instruction: 'Grind 18g of coffee into the portafilter basket.', duration: 0 },
    { title: 'Distribute & tamp', instruction: 'Distribute the grounds evenly, then tamp firmly with level pressure. Give it a slight twist at the end.', duration: 0 },
    { title: 'Pull shot', instruction: 'Lock in the portafilter and start your shot. Target 36ml in 25–30 seconds for a 1:2 ratio.', duration: 30 },
    { title: 'Evaluate', instruction: 'Taste immediately. Check colour, texture, and balance — bring these notes to the tasting screen.', duration: 0 },
  ],
  'Moka pot': [
    { title: 'Prep water', instruction: 'Fill the bottom chamber with water to just below the safety valve. Use pre-heated water for better results.', duration: 0 },
    { title: 'Add coffee', instruction: 'Fill the filter basket with 20g of finely ground coffee. Level it off — do not tamp.', duration: 0 },
    { title: 'Assemble & heat', instruction: 'Screw the chambers together tightly. Place on medium heat with the lid open.', duration: 180 },
    { title: 'Watch the flow', instruction: 'When coffee flows, it should be a steady golden-brown stream. Keep a close eye on it.', duration: 60 },
    { title: 'Remove from heat', instruction: 'When the flow turns to a sputter, remove immediately. Run the base under cold water to stop extraction.', duration: 0 },
  ],
  'Cold brew': [
    { title: 'Grind coarse', instruction: 'Grind 100g of coffee very coarsely — coarser than French press.', duration: 0 },
    { title: 'Combine', instruction: 'Add the coffee to your jar or vessel. Pour over 600ml of cold, filtered water.', duration: 0 },
    { title: 'Stir', instruction: 'Stir gently to make sure all grounds are fully saturated.', duration: 0 },
    { title: 'Into the fridge', instruction: 'Cover and refrigerate for 12–18 hours. Longer steeping = stronger concentrate. Come back when ready.', duration: 0 },
    { title: 'Filter & serve', instruction: 'Strain through a fine mesh or cheesecloth into a clean jar. Serve over ice, diluted 1:1 with water or milk.', duration: 0 },
  ],
  'Drip machine': [
    { title: 'Fresh filter', instruction: 'Add a new paper filter to the basket. Rinse with hot water if you can, then discard.', duration: 0 },
    { title: 'Add coffee', instruction: 'Add 60g of medium-ground coffee — about 1g per 16ml of water.', duration: 0 },
    { title: 'Fill reservoir', instruction: 'Add 1000ml of filtered water. Water quality makes a bigger difference than you might think.', duration: 0 },
    { title: 'Brew', instruction: 'Start your machine. A good machine takes 6–8 minutes to brew.', duration: 360 },
    { title: 'Pour fresh', instruction: 'Pour immediately once brewing is complete. Coffee deteriorates quickly on a warming plate.', duration: 0 },
  ],
};

export function getStepsForMethod(method: string): BrewStep[] {
  return BREW_STEPS[method] ?? BREW_STEPS['V60'];
}
