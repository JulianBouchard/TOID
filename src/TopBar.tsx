import "./Stylesheets/TopBar.css";
import React from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { FileEntry } from "./LeftBar";

type TextBoxProps = {
  label: string;
  initial: number | string;
  set: (t: number) => void;
  errorReason: (s: number) => boolean;
  errorText: string;
  parseFunc: (s: string) => number;
  stepSize: string;
  isString?: boolean;
  setString?: (s: string) => void;
  disabled?: boolean;
};
/**
 * @param {string} label - The label on the text box.
 * @param {number} initial - The initial threshold before the user makes changes.
 * @param {string} errorText - The text to display if validation fails.
 * @param {string} stepSize - By how much the up/down arrows change the input value.
 * @return Returns a text box that validates input and displays possible errors.
 *         Values are only set once valid.
 */
const TextBox: React.FC<TextBoxProps> = ({
  label,
  initial,
  set,
  errorReason,
  errorText,
  parseFunc,
  stepSize,
  isString,
  setString,
  disabled,
}) => {
  const [current, setCurrent] = React.useState<number | string>(initial);

  return (
    <>
      {typeof current === "number" && !isString ? (
        <TextField
          label={label}
          error={errorReason(current)}
          value={current}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCurrent(parseFunc(e.target.value))
          }
          onBlur={() => (errorReason(current) ? null : set(current))}
          type="number"
          helperText={errorReason(current) ? errorText : ""}
          inputProps={{ step: stepSize }}
          disabled={disabled}
        />
      ) : (
        <TextField
          label={label}
          value={current}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCurrent(e.target.value)
          }
          onBlur={() => (!!setString ? setString(current.toString()) : null)}
          type="string"
          inputProps={{ step: stepSize }}
          disabled={disabled}
        />
      )}
    </>
  );
};

enum Method {
  Alpha,
  Heuristic,
}

type TopBarProps = {
  files: FileEntry[];
  setLoading: (b: boolean) => void;
  setData: (d: null) => void;
  running: boolean;
  setRunning: (b: boolean) => void;
};

const TopBar: React.FC<TopBarProps> = ({
  files,
  setLoading,
  setData,
  running,
  setRunning,
}) => {
  const [paused, setPaused] = React.useState<boolean>(false);
  // the method the user selected (Alpha or Heuristic)
  const [selectedMethod, setSelectedMethod] = React.useState<Method>(
    Method.Heuristic
  );

  const [cleanFreq, setCleanFreq] = React.useState<number>(1000);
  const [iscBudget, setIscBudget] = React.useState<number>(1000);
  const [k, setK] = React.useState<number>(0.05);
  const [y3, setY3] = React.useState<number>(0.99);
  const [updateFreq, setUpdateFreq] = React.useState<number>(50);
  const [updateDelay, setUpdateDelay] = React.useState<number>(2);
  const [ciID, setciID] = React.useState<string>("knr");

  const [t1, setT1] = React.useState<number>(0.6);
  const [t2, setT2] = React.useState<number>(1);
  const [t3, setT3] = React.useState<number>(0.5);
  const [t4, setT4] = React.useState<number>(0.5);

  React.useEffect(() => {
    if (running) {
      fetch("./update", {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({
          method: selectedMethod,
          cleanFreq: cleanFreq,
          iscBudget: iscBudget,
          k: k,
          y3: y3,
          updateFreq: updateFreq,
          updateDelay: updateDelay,
        }),
      });
    }
  }, [cleanFreq, k, y3, updateFreq, updateDelay]);

  async function getContent() {
    const fileContents: string[] = Array(files.length);
    for (let i = 0; i < files.length; i++) {
      fileContents[i] = await files[i].file.text();
    }
    return Promise.resolve(fileContents);
  }

  const sendStart = () => {
    setLoading(true);
    setData(null);
    getContent().then((content) => {
      fetch("./start", {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({
          method: selectedMethod,
          cleanFreq: cleanFreq,
          iscBudget: iscBudget,
          k: k,
          y3: y3,
          updateFreq: updateFreq,
          updateDelay: updateDelay,
          ciID: ciID,
          t1: t1,
          t2: t2,
          t3: t3,
          t4: t4,
          inputFiles: content,
        }),
      });
      fetch("./t", {
        method: "GET",
      });
    });
    setRunning(true);
  };

  return (
    <div className="TopBar">
      <div className="MainInput">
        <Tooltip
          title={
            files.length > 10
              ? "This tool currently only allows up to 10 files at once"
              : ""
          }
        >
          <span>
            <Button
              className="startButton"
              onClick={() => {
                if (running) {
                  fetch("./stop", {
                    method: "GET",
                  });
                  setRunning(false);
                  setPaused(false);
                  setLoading(false);
                } else {
                  sendStart();
                }
              }}
              disabled={(files.length == 0 && !running) || files.length > 10}
            >
              {running ? "Stop" : "Start"}
            </Button>
          </span>
        </Tooltip>
        <Button
          disabled={files.length == 0}
          onClick={() => {
            setPaused(!paused);
            fetch("./pause", {
              method: "GET",
            });
          }}
        >
          {paused ? "Resume Stream" : "Pause Stream"}
        </Button>
        <TextBox
          label="Miner Budget"
          initial={cleanFreq}
          set={setCleanFreq}
          errorReason={(f) => isNaN(f) || f < 1}
          errorText="Please enter a whole number larger than 0"
          parseFunc={parseInt}
          stepSize="100"
          disabled={running}
        />
        <TextBox
          label="ISC Budget"
          initial={iscBudget}
          set={setIscBudget}
          errorReason={(f) => isNaN(f) || f < 1}
          errorText="Please enter a whole number larger than 0"
          parseFunc={parseInt}
          stepSize="100"
          disabled={running}
        />
        <TextBox
          label="ISC Parameter k"
          initial={k}
          set={setK}
          errorReason={(f) => isNaN(f) || f < 0 || f >= 0.5}
          errorText="Please enter a number in range [0,0.5]"
          parseFunc={parseFloat}
          stepSize="0.1"
        />
        <TextBox
          label="ISC Parameter y_3"
          initial={y3}
          set={setY3}
          errorReason={(f) => isNaN(f) || f < 0 || f > 1}
          errorText="Please enter a number in range [0,1]"
          parseFunc={parseFloat}
          stepSize="0.1"
        />
        <TextBox
          label="Update Frequency"
          initial={updateFreq}
          set={setUpdateFreq}
          errorReason={(f) => isNaN(f) || f < 0}
          errorText="Please enter a whole number larger than 0"
          parseFunc={parseInt}
          stepSize="5"
        />
        <TextBox
          label="Update Delay"
          initial={updateDelay}
          set={setUpdateDelay}
          errorReason={(f) => isNaN(f) || f < 0}
          errorText="Please enter a number larger than 0"
          parseFunc={parseFloat}
          stepSize="1"
        />
        <TextBox
          label="Cross Instance ID"
          initial={ciID}
          setString={setciID}
          errorReason={() => false}
          errorText="Please enter a string"
          parseFunc={() => 0}
          set={() => 0}
          stepSize="0"
          isString={true}
          disabled={running}
        />
      </div>
      <div className="radioWrapper">
        <FormControl component="fieldset">
          <RadioGroup row aria-label="miner" name="miner-radio-buttons-group">
            <FormControlLabel
              value="alpha"
              control={
                <Radio
                  onClick={() => setSelectedMethod(Method.Alpha)}
                  checked={selectedMethod === Method.Alpha}
                  disabled={running}
                />
              }
              label="Alpha Miner"
            />
            <FormControlLabel
              value="heuristic"
              control={
                <Radio
                  onClick={() => setSelectedMethod(Method.Heuristic)}
                  checked={selectedMethod === Method.Heuristic}
                  disabled={running}
                />
              }
              label="Heuristic Miner"
            />
          </RadioGroup>
        </FormControl>
        <div
          className="textBoxWrapper"
          style={
            selectedMethod === Method.Heuristic
              ? { display: "flex" }
              : { display: "none" }
          }
        >
          <TextBox
            label="Dependancy Threshold"
            initial={t1}
            set={setT1}
            errorReason={(f) => isNaN(f) || f < -1 || f > 1}
            errorText="Please enter a number in range [-1,1]"
            parseFunc={parseFloat}
            stepSize="0.1"
            disabled={running}
          />
          <TextBox
            label="Positive Observation Threshold"
            initial={t2}
            set={setT2}
            errorReason={(f) => isNaN(f) || f < 0}
            errorText="Please enter a positive whole number"
            parseFunc={parseInt}
            stepSize="1"
            disabled={running}
          />
          <TextBox
            label="Relative to Best Threshold"
            initial={t3}
            set={setT3}
            errorReason={(f) => isNaN(f) || f < 0 || f > 1}
            errorText="Please enter a number in range [0,1]"
            parseFunc={parseFloat}
            stepSize="0.1"
            disabled={running}
          />
          <TextBox
            label="AND-Threshold"
            initial={t4}
            set={setT4}
            errorReason={(f) => isNaN(f) || f < -1 || f > 1}
            errorText="Please enter a number in range [-1,1]"
            parseFunc={parseFloat}
            stepSize="0.1"
            disabled={running}
          />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
