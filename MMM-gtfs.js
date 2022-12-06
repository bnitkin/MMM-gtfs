/* Magic Mirror
 * Module: MMM-gtfs
 * A generic transit parser to display upcoming departures
 * for a selected set of lines
 *
 * By Ben Nitkin
 * MIT Licensed.
 */

Module.register("MMM-gtfs", {
   // Default module config.
   defaults: {
      // GTFS data to load - this is the config object described in:
      // https://www.npmjs.com/package/gtfs/v/2.4.4#configuration
      //
      // The default below shows how to load multiple GTFS files,
      // but custom headers & auth-tokens are supported.
      gtfs_config: {
         agencies: [
            // These are SEPTA bus & rail routes. Go to transitfeeds.com
            // or your transit agency's site to find local GTFS data.
            // Excluding shapes makes loading faster.
//            {"url": "https://transitfeeds.com/p/septa/262/latest/download", exclude: ['shapes']},
//            {"url": "https://transitfeeds.com/p/septa/263/latest/download", exclude: ['shapes']},
            {"path": "/home/ben/Downloads/bus.zip", exclude: ['shapes']},
         ]
      },

      // Route + station pairs to monitor for departures
      queries: [
         {route_name: "Chestnut Hill West", stop_name: "Tulpehocken", direction: 0},
         {route_name: "Chestnut Hill East", stop_name: "Germantown", direction: 0},
      ],
      departuresPerRoute: 3,
   },

   start: function () {
      // Send the config dictionary to the helper.
      this.sendSocketNotification("GTFS_STARTUP", this.config.gtfs_config);

      // Set up initial DOM wrapper
      this.wrapper = document.createElement("table");
      this.trips = [];
   },

   getDom: function () {
      // Fake trip for comparison purposes
      let lastTrip = {trip_terminus: '', route_name: '', stop_name: ''};
      let row;
      let departureCount = 0;

      // Clear contents
      this.wrapper.innerHTML = "";

      for (trip of this.trips) {
         if (trip.stop_name != lastTrip.stop_name) {
            row = this.wrapper.insertRow();
            let stop = row.insertCell();
            stop.innerHTML = trip.stop_name;
            stop.colspan = 5;
         }
         if (trip.route_name != lastTrip.route_name
          || trip.trip_terminus != lastTrip.trip_terminus) {
            departureCount = 0;

            row = this.wrapper.insertRow();
            let route = row.insertCell();
            route.innerHTML = trip.route_name;
            route.className = "align-left bright";

            let terminus = row.insertCell();
            terminus.innerHTML = trip.trip_terminus;
            terminus.className = "align-left";
            terminus.className += " xsmall";
         }

         lastTrip = trip;

         if (departureCount == this.config.departuresPerRoute) continue;
         departureCount += 1;

         let departure_time = row.insertCell();
         Log.log(trip);
         let minutes = ((trip.stop_time - Date.now()) / 1000 / 60).toFixed();
         departure_time.innerHTML = minutes;

         if (minutes <= 5) {
            departure_time.style.color = "#f66";
         }
         if (departureCount == 1) {
            departure_time.className = "bright";
            departure_time.style.width = "35px";
         } else {
            departure_time.className = "dim xsmall";
            departure_time.style.width = "30px";
         }
      }

      return this.wrapper;
   },

   socketNotificationReceived: function(notification, payload) {
      // Once the GTFS data is all imported, resolve our queries.
      if (notification == "GTFS_READY") {
         // Daily poll for new GTFS info.
         setInterval(() => this.runQueries(), 1000*60*60*24);
         // Every minute, check in on real-time data (TODO)
         setInterval(() => this.updateDepartures(), 1000*60*1);
      }
      if (notification == "GTFS_QUERY_RESULTS") {
         Log.log("MMM-gtfs got a query response");
         for (trip of payload) trip.stop_time = new Date(trip.stop_time);
         this.trips = this.trips.concat(payload);
         Log.log(this.trips);
         this.updateDepartures();
      }
   },

   runQueries: function() {
      // Generate more trips from the GTFS source
      for (query of this.config.queries) {
         Log.log("Querying");
         Log.log(query);
         this.trips = [];
         this.sendSocketNotification("GTFS_QUERY2", {'gtfs_config': config.gtfs_config, 'query': query});
      }
   },

   updateDepartures: function() {
      // TODO: Update departures with realtime data.
      this.trips = this.trips.filter(trip => trip.stop_time > Date.now())
      Log.log(this.trips.length + " trips in queue");
      this.updateDom();
   },
});