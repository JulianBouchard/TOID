import "./Stylesheets/LeftBar.css";
import React from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ClearIcon from "@mui/icons-material/Clear";
import Tooltip from "@mui/material/Tooltip";

type ListItemProps = {
  name: string;
  removeItem: (id: string) => void;
};

const ListItem: React.FC<ListItemProps> = ({ name, removeItem }) => {
  return (
    <li className="ListItem">
      <div className="NameWrapper">
        <p>{name}</p>
      </div>
      <div className="ButtonWrapper">
        <IconButton onClick={() => removeItem(name)}>
          <ClearIcon />
        </IconButton>
      </div>
    </li>
  );
};

export type FileEntry = {
  id: string;
  file: File;
};

type LeftBarProps = {
  files: FileEntry[];
  setFiles: (fes: FileEntry[]) => void;
  errorMsg: string;
};

const LeftBar: React.FC<LeftBarProps> = ({ files, errorMsg, setFiles }) => {
  const removeItem = (item_id: string) => {
    setFiles(files.filter((fe) => fe.id != item_id));
  };

  React.useEffect(() => {
    console.log(files.length);
  }, [files]);

  return (
    <div className="LeftBar">
      <div className="uploadWrapper">
        <label htmlFor="contained-button-file">
          <input
            className="input"
            accept=".xes"
            id="contained-button-file"
            multiple={true}
            type="file"
            onChange={(event) => {
              if (
                event == null ||
                event.target == null ||
                event.target.files == null
              )
                return;

              console.log(event.target.files.length);

              const toAdd = [];
              for (let i = 0; i < event.target.files.length; i++) {
                if (
                  !files
                    .map((file) => file.id)
                    .includes(event.target.files[i].name)
                ) {
                  toAdd.push({
                    id: event.target.files[i].name,
                    file: event.target.files[i],
                  });
                  console.log(toAdd);
                }
              }
              setFiles(files.concat(toAdd));
            }}
          />
          <Tooltip open={true} title={errorMsg} placement="bottom-end" arrow>
            <Button variant="contained" component="span">
              Upload
            </Button>
          </Tooltip>
        </label>
      </div>
      <ul className="FileList">
        {files.map((file) => (
          <ListItem key={file.id} name={file.id} removeItem={removeItem} />
        ))}
      </ul>
      <a
        className="gitContainer"
        href="https://github.com/JulianBouchard/TOID/"
      >
        GitHub
      </a>
    </div>
  );
};

export default LeftBar;
