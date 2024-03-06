# Heat pump performance

- How do heat pumps know what % of the variable speed compressor capacity to apply? The optimization system here assumes thats we'll get the maximum COP possible by selecting this value exactly correctly for a given hour, but this seems hard to do correctly.
- Where do the constants for defrost-cycle derating come from?
- Is interpolating coefficient of performance between min & max capacity for a given outside temperature linearly accurate?
- It seems like the simulation assumes that maximum capacity doesn't degrade when subject to temperatures much lower than the ones specified in the performance specs. This seems like it would lead to especially misleading results in freezing cold environments for heat pumps that only having ratings down to 5F (defrost de-rating makes this less true, but the same concept when calculating cooling capacity for extremely hot temperatures still applies)
- The code de-rated COP by altitude, but the referenced source only seems to de-rate capacity. Where does this come from?
- Why doesn't the laboratory testing COP values already accomodate for defrost cycles?
- Is it intentional that the COPs never report below 1.0? This seems possibly not physically accurate.

# Load calculation

- Where do the 200 & 230 BTU/hr numbers come from for occupant
- Where do the constants come from for infiltration, convenction+conduction, and solar gain?

# Solar radiation calculation

I see the following in `analysis/costs/weather.ipynyb:

    solar_radiation_horiz = pysolar.radiation.get_radiation_direct(tz_dt, solar_altitude)
    solar_radiation_vert = pysolar.radiation.get_radiation_direct(tz_dt, (90 - solar_altitude))

Which isn't intuitively how I'd expect to calculate this. Should it be the following?

    solar*radiation = pysolar.radiation.get_radiation_direct(tz_dt, solar_altitude)
    solar_radiation_horiz = solar_radiation * cos(solar*altitude)
    solar_radiation_vert = solar_radiation * sin(solar_altitude)

For example, the results here in a comment suggest something is wrong:

    # solar radiation at Manual J P99 cooling load for baker's house, given we're using constants from baker's house below
    # Assume Manual J peak hour is 1800, on August 1
    # 1600 = 806, 827, 43 degrees
    # 1700 = 720, 863, 30 degrees
    # 1800 = 535, 883, 17 degrees
    # 1900 = 72, 890, 4 degrees
    solar_radiation_horiz_baseline = 535
    solar_radiation_vert_baseline = 883

Both the vertical _and_ horizontal components should be falling as we reach sunset (because the sunlight needs to pass through a larger cylinder of the atmosphere to reach out)

TODO(jlfwong): Confirm that these are different using pysolar

# Electric furnaces

The heat pumps hooray codebase says electric furnaces have no capacity limit, but all the advertised furnaces I see have a kW limit.

# Significant divergence

- IAT BTU calculation in heat pumps hooray seems like it's off by ~50x. This is a TODO in the python server codebase
- hvac-math simulates equipment being turned on & off, rather than just assuming equipment operates instantaneously to maintain temperature. This supports calculation of real resulting temperatures when equipment is undersized
- The solar calculations in the python codebase are incorrect
- So far, zones is assumed to always be 1 in this codebase
