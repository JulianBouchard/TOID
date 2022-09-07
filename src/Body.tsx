import "./Stylesheets/Body.css";
import React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Graph, { DataType } from "./Graph";
import LeftBar, { FileEntry } from "./LeftBar";
import TopBar from "./TopBar";
import Timeline from "./Timeline";

type RawDataType = {
  models: {
    id: number;
    places: string[];
    transitions: string[];
    links: {
      src: string;
      dest: string;
      weight: number;
      intensity: number;
    }[];
  }[];
  iscLinks: string[][];
  errorMsg: string;
  timestamp: string;
};

const processData = (rawData: RawDataType | null, data: DataType | null) => {
  console.log("--");
  console.log(rawData);
  console.log(data);

  if (!rawData) {
    return null;
  }

  const newModels = [];
  for (let i = 0; i < rawData.models.length; i++) {
    const oldPlaces: string[] = !data
      ? []
      : data.models[i].oldPlaces.concat(data.models[i].newPlaces);

    const oldTransitions: string[] = !data
      ? []
      : data.models[i].oldTransitions.concat(data.models[i].newTransitions);

    const newPlaces = rawData.models[i].places.filter(
      (p) => !oldPlaces.includes(p)
    );

    const newTransitions = rawData.models[i].transitions.filter(
      (t) => !oldTransitions.includes(t)
    );

    newModels.push({
      id: rawData.models[i].id,
      newPlaces: newPlaces,
      oldPlaces: oldPlaces,
      newTransitions: newTransitions,
      oldTransitions: oldTransitions,
      links: rawData.models[i].links,
    });
  }

  const oldLinks = !data ? [] : data.currentIscLinks;

  const fadingIscLinks = oldLinks.filter(
    (ol) => !rawData.iscLinks.some((nl) => ol[0] === nl[0] && ol[1] === nl[1])
  );

  return {
    models: newModels,
    fadingIscLinks: fadingIscLinks,
    currentIscLinks: rawData.iscLinks,
  };
};

const colors = [
  "lightsalmon",
  "blue",
  "purple",
  "black",
  "green",
  "brown",
  "red",
  "aquamarine",
  "grey",
  "fuchsia",
];

const Body: React.FC = () => {
  const [files, setFiles] = React.useState<FileEntry[]>([]);
  // backend response with graph data
  const [rawData, setRawData] = React.useState<RawDataType | null>(null);
  const [data, setData] = React.useState<DataType | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [running, setRunning] = React.useState<boolean>(false);

  const [selectedData, setSelectedData] = React.useState<DataType | null>(null);

  const [eS, setES] = React.useState<EventSource>();

  React.useEffect(() => {
    const es = new EventSource("http://[::1]:8030/stream");
    // const es = new EventSource("https://lehre.bpm.in.tum.de/ports/8030/stream")
    setES(es);
  }, []);

  React.useEffect(() => {
    if (!!eS) {
      eS.onmessage = (e) => showIncoming(JSON.parse(e.data));
    }
  }, [eS]);

  const showIncoming = (inc: RawDataType) => {
    if (inc.errorMsg === "complete") {
      setRawData(inc);
      setRunning(false);
    } else {
      setRawData(inc);
      setRunning(true);
    }
  };

  React.useEffect(() => {
    const newData = processData(rawData, data);
    setData(newData);
  }, [rawData]);

  return (
    <>
      <TopBar
        files={files}
        setLoading={setLoading}
        setData={setRawData}
        running={running}
        setRunning={setRunning}
      />
      <div className="lowerBody">
        <LeftBar
          files={files}
          setFiles={setFiles}
          errorMsg={
            !rawData || rawData.errorMsg == "complete" ? "" : rawData.errorMsg
          }
        />
        {loading && !rawData ? (
          <div className="loadingOverlay">
            <CircularProgress size={50} />
          </div>
        ) : (
          <div className="output">
            <Timeline
              data={data}
              timeStamp={rawData?.timestamp ?? ""}
              setSelectedData={setSelectedData}
              colors={colors}
            />
            <Graph
              data={!!selectedData ? selectedData : data}
              hideNames={true}
              colors={colors}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default Body;
