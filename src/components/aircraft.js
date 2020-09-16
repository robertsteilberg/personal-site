import React, { useEffect, useState } from "react";
import "../styles/components/aircraft.scss";
import _ from "lodash";
import loadable from "@loadable/component";

// react-text-transition cannot do SSR
const TextTransition = loadable(() => import("react-text-transition"));

// const WS_URL = `ws://localhost:80/airports/kdca?secret=${process.env.GATSBY_SERVE1090_SECRET}`;
const WS_URL = `wss://aircraft.robsteilberg.io/airports/kdca?secret=${process.env.GATSBY_SERVE1090_SECRET}`;
const SOCKET_RETRY_TIME = 5000;

const Aircraft = () => {
  /**
   * Format the text that goes into aircraft DOM, adding extra
   * data if it is available
   */
  function formatText(ac, inbound) {
    let text = `${ac.flight}`;
    if (ac.type) {
      text += `, ${ac.type}`;
    }
    if (inbound && ac.origin) {
      text += ` from ${ac.origin}`;
    } else if (!inbound && ac.destination) {
      text += ` to ${ac.destination}`;
    }
    return text;
  }

  /**
   * DOM-ify an individual aircraft object
   */
  function aircraftDom(ac, inbound) {
    return (
      <a
        key={ac.hex}
        target="_blank"
        rel="noreferrer"
        href={"https://flightaware.com/live/flight/" + ac.flight}>
        {formatText(ac, inbound)}
      </a>
    );
  }

  /**
   * Build the DOM that defines tracking data
   */
  function domify(aircraft, inbound) {
    if (_.get(aircraft, "length")) {
      const dom = [aircraftDom(aircraft[0], inbound)];
      if (aircraft[1]) {
        dom.push(
          <span className="next-aircraft">
            {", followed by "}
            {aircraftDom(aircraft[1], inbound)}
          </span>
        );
      }
      return dom;
    } else {
      return "none in range";
    }
  }

  /**
   * Parse the WebSocket message and build the data object
   */
  function parseMessage(event) {
    try {
      const data = JSON.parse(event.data);

      const result = {
        arriving: domify(data.arriving, true),
        arrived: domify(data.arrived, true),
        departing: domify(data.departing, false),
        departed: domify(data.departed, false),
        numInRange: _.get(data, "stats.numInRange", 0),
      };

      setAircraftData(result);
    } catch (e) {
      setAircraftData(initialAircraftData);
    }
  }

  /**
   * Attach a WebSocket to recieve aircraft data
   */
  function initSocket() {
    const ws = new WebSocket(WS_URL);
    ws.addEventListener("close", () => {
      setAircraftData(initialAircraftData);
      setTimeout(initSocket, SOCKET_RETRY_TIME);
    });
    ws.addEventListener("message", parseMessage);
  }

  const initialAircraftData = {
    arriving: "none in range",
    arrived: "none in range",
    departing: "none in range",
    departed: "none in range",
    numInRange: 0,
  };

  const [aircraftData, setAircraftData] = useState(initialAircraftData);
  const [numInRange, setNumInRange] = useState(0);
  const [direction, setDirection] = useState("up");

  useEffect(initSocket, []);

  /**
   * Cache and compare current and previous numInRange to compute
   * direction of the number spinner
   */
  useEffect(() => {
    // check if new numInRange is greater or lesser than the current numInRange
    const direction = aircraftData.numInRange > numInRange ? "down" : "up";
    setDirection(direction);
    setNumInRange(aircraftData.numInRange);
  }, [aircraftData, numInRange]);

  return (
    <>
      <div className="aircraft">
        <div className="header">
          KDCA live feed
          <sup>
            <a
              href="https://github.com/robertsteilberg/roob1090"
              target="_blank"
              rel="noreferrer">
              what's this?
            </a>
          </sup>
        </div>
        <div className="ribbon">
          <div className="cycle">
            <div>Arriving: {aircraftData.arriving}</div>
            <div>Arrived: {aircraftData.arrived}</div>
            <div>Departing: {aircraftData.departing}</div>
            <div>Departed: {aircraftData.departed}</div>
          </div>
          <div className="stats">
            <div>
              <TextTransition
                text={aircraftData.numInRange}
                direction={direction}
                inline={true}
              />
              {" aircraft in range"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Aircraft;
