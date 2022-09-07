import "./Stylesheets/Timeline.css";
import React from "react";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import { DataType } from "./Graph";

type TimelineEvent = {
  numAdditions: number;
  numSubtractions: number;
  timeStamp: string;
  data: DataType;
  gradient: string;
};

type TimelineProps = {
  data: DataType | null;
  timeStamp: string;
  setSelectedData: (d: DataType | null) => void;
  colors: string[];
};

const Timeline: React.FC<TimelineProps> = ({
  data,
  timeStamp,
  setSelectedData,
  colors,
}) => {
  const [events, setEvents] = React.useState<TimelineEvent[]>([]);
  const [oldLinks, setOldLinks] = React.useState<string[][]>([]);
  const [additions, setAdditions] = React.useState<string[][]>([]);
  const [subtractions, setSubtractions] = React.useState<string[][]>([]);

  const [pausedView, setPausedView] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!data) {
      return;
    }

    setSubtractions(
      oldLinks.filter(
        (ol) =>
          !data.currentIscLinks.some((nl) => ol[0] === nl[0] && ol[1] === nl[1])
      )
    );

    setAdditions(
      data.currentIscLinks.filter(
        (ol) => !oldLinks.some((nl) => ol[0] === nl[0] && ol[1] === nl[1])
      )
    );

    setOldLinks(data.currentIscLinks);
  }, [data?.currentIscLinks]);

  React.useEffect(() => {
    if ((additions.length == 0 && subtractions.length == 0) || !data) {
      return;
    }

    const idCounts = Array(data.models.length).fill(0);
    additions.concat(subtractions).forEach((x) => {
      idCounts[parseInt(x[2])] += 1;
      idCounts[parseInt(x[3])] += 1;
    });
    const sumCounts = idCounts.reduce((a, b) => a + b, 0);
    const colorRatios = idCounts.map((c) => (c * 360) / sumCounts);
    let gradient = "";
    let lastDeg = 0;
    for (let i = 0; i < colorRatios.length; i++) {
      if (i == 0) {
        gradient += colors[i] + " " + colorRatios[i] + "deg, ";
        lastDeg += colorRatios[i];
      } else if (i == colorRatios.length - 1) {
        gradient += colors[i] + " " + lastDeg + "deg";
      } else {
        gradient +=
          colors[i] +
          " " +
          lastDeg +
          "deg " +
          (colorRatios[i] + lastDeg) +
          "deg, ";
        lastDeg += colorRatios[i];
      }
    }
    colorRatios.map((c, i) => "" + colors[i] + " " + c + "deg");

    const eventToAdd: TimelineEvent = {
      numAdditions: additions.length,
      numSubtractions: subtractions.length,
      timeStamp: timeStamp,
      data: data,
      gradient: gradient,
    };

    const temp = events;
    if (temp.length < 10) {
      temp.push(eventToAdd);
    } else {
      for (let i = 1; i < 10; i++) {
        temp[i - 1] = temp[i];
      }
      temp[9] = eventToAdd;
    }

    setEvents(temp);
    console.log(temp);
  }, [additions, subtractions]);

  return (
    <div className="timeLineContainer">
      <div className="timeLineWrapper">
        <hr className="line"></hr>
        <div className="eventWrapper">
          {events.map((e, i) => (
            <Tooltip
              key={e.timeStamp}
              title={
                (e.numAdditions ? "" + e.numAdditions + " Additions \n" : "") +
                (e.numSubtractions
                  ? "" + e.numSubtractions + " Removals \n"
                  : "") +
                ("At " + e.timeStamp)
              }
            >
              <Button
                className="eventButton"
                key={e.timeStamp}
                onClick={() => {
                  setSelectedData(e.data);
                  setPausedView(true);
                }}
                variant="contained"
                style={{
                  background: "conic-gradient(" + e.gradient + ")",
                }}
              />
            </Tooltip>
          ))}
        </div>
      </div>
      <Tooltip title={"Last update at " + timeStamp}>
        <Button
          onClick={() => {
            pausedView ? setSelectedData(null) : setSelectedData(data);
            setPausedView(!pausedView);
          }}
        >
          {pausedView ? "Live" : "Pause"}
        </Button>
      </Tooltip>
    </div>
  );
};

export default Timeline;
