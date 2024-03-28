# HVAC Simulator

This is the source supporting https://hvac-sim-app.onrender.com/. It contains
the code to simulate HVAC systems for homes to evaluate their utility costs and
greenhouse gas emissions.

This allows the creation of tools to evaluate heat pumps v.s. other heating and
cooling solutions using real historical weather data.

The idea and implementation were inspired heavily by https://heatpumpshooray.com/

## How does it work?

This repository contains two main things: an HVAC simulation library, and a web
application for a heat pump calculator.

### The simulation library

The HVAC simulation library simulates on a 20 minute time step over long spans
of time (up to a year with current weather data).

At each time step, the simulator...

1. Uses a simulated thermostat to decide whether to turn heating or cooling
   equipment on or off based on historical weather data and a simulated internal
   temperature.

2. If equipment is turned on, the simulator calculates the BTU/hr power of each
   appliance, along with its fuel usage (electricity, gas, etc.)

3. Based on a model of building geometry, weather conditions, and time-of-day,
   the passive thermal loads on the house are calculated in BTU/hr. This
   conduction, convection, infiltration, solar gain, and occupant body
   heat.

4. At the end of each time step, the BTU/hr from the HVAC equipment and the BTU/hr
   from passive thermal loads are multiplied with the duration of the timestep to
   get a net BTU change for the time step. Using an estimated thermal mass of the
   house, this is used to update the indoor air temperature for the next time step.

5. At the end of each time step, energy usage is recorded into monthly bills, using
   configurable utility tariffs.

At the end of the simulation, utility bills are tabulated, and emissions are
calculated based on fuel usage.

The library is designed to be extremely flexible. Custom HVAC devices can be
created, custom thermostat algorithms can be applied, and time-of-use pricing
can be implemented for utility bills.

### The heat pump calculator web app

The web app uses the above simulation library to calculate utility bills for
Canada. To set up the simulation, we gather weather and utility cost information
for Canada, and automatically select an air-sourced heat pump based on the
specific situation of the simulated home.

Weather information is sourced from the [ECMWF ERA5 hourly dataset](https://cds.climate.copernicus.eu/cdsapp#!/dataset/reanalysis-era5-pressure-levels?tab=overview).

2023 weather data for the majority of Canada is downloaded as a 2GB binary file,
then split into many JSON files (one per 3-letter prefix of a postal code),
compressed, and uploaded to S3. This allows the web app to use real weather data
without needing a server.

Performance data for heat pumps is sourced from the [NEEP Cold Climate Air Source Heat Pump Database](https://neep.org/heating-electrification/ccashp-specification-product-list).

## Why make this?

There are many heat pump calculators out in the wild, though none I could find
seemed accurate and open source. While this repository is designed with Canada
in mind, the core simulation library should work anywhere in the world.

If you're motivated to get a version of this calculator working in your country,
feel free to fork this repository and make it happen!