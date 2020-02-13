import React from "react";
import ReactDOM from "react-dom";
import styled from "@emotion/styled";
import generateBarcode from "../dist/index.js";
import Tape from "./Tape";
import logo from './logo.svg'
import "normalize.css";
import "./index.css";

const App = () => {
  const [code, setCode] = React.useState("");
  const [svg, setSvg] = React.useState(null);

  const generate = () => {
    setSvg(generateBarcode(code));
  };

  return (
    <Wrapper>
      <Column>
        {/* <Title>Barcode Generator</Title> */}
        <Logo src={logo} />
        <PerspectiveWrapper>
          <Row>
            <Input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/ /g, ""))}
              onKeyDown={e => {
                if (e.keyCode === 13) generate();
              }}
            />
            <div style={{position: 'relative'}}>
              <Button onClick={generate}>
                <Circle>GO</Circle>
              </Button>
              <ButtonBottom />
            </div>
          </Row>
          <TapeContainer>
            <Tape svg={svg} />
          </TapeContainer>
        </PerspectiveWrapper>
      </Column>
    </Wrapper>
  );
};

const Wrapper = styled("div")`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const Logo = styled('img')`
  margin-bottom: 30px;
  width: 260px;
`

const Column = styled("div")`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 100px;
`;

const PerspectiveWrapper = styled('div')`
  position: relative;
`

const TapeContainer = styled('div')`
  content: "";
  z-index: 0;
  width: calc(100% + 8px);
  height: 70px;
  background: linear-gradient(to right, #424242 0%, #6c6c6c 3%, #6c6c6c 65%, #6c6c6c 97%, #424242 100%);
  box-shadow: inset 0px -30px 30px rgba(0,0,0,.3);
  bottom: -60px;
  left: -4px;
  position: absolute;
  border: 1px solid rgb(103, 103, 103);
  border-radius: 3px 3px 6px 6px;
`

const Row = styled("div")`
  display: flex;
  align-items: center;
  padding: 15px;
  border: 1px solid rgba(0,0,0, 0.2);
  border-radius: 8px;
  background: linear-gradient(to right, #505050 0%, #6a6a6a 3%, #797777 35%, #6b6b6b 97%, #505050 100%);
  box-shadow: inset 0px 0px 5px rgba(255,255,255,.2);
  transform: perspective(1000px) rotateX(20deg);
  position: relative;
  z-index: 1;
`;

const Title = styled("h1")`
  font-family: "VT323", monospace;
  font-weight: 300;
  margin-bottom: 30px;
  font-size: 48px;
`;

const Input = styled("input")`
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgb(197, 208, 161);
  color: rgb(33, 43, 39);
  border-radius: 5px;
  box-shadow: inset 0px 7px 15px -5px rgba(0, 0, 0, 0.2),
    inset 0px -7px 15px -5px rgba(255, 255, 255, 1);
  font-size: 70px;
  width: 400px;
  height: 70px;
  padding: 10px;
  padding-top: 20px;
  margin-right: 10px;
  font-family: "Digital";
  &:focus {
    background: rgb(208, 215, 183);
    outline: none;
  }
`;

const Button = styled("button")`
  font-size: 25px;
  font-weight: 600;
  text-transform: uppercase;
  height: 70px;
  width: 70px;
  ${'' /* border: 1px solid rgba(0,0,0,.6); */}
  ${'' /* border-bottom-color: #e2e1c5; */}
  border: none;
  background: linear-gradient(to top, #dddcc0, #f7f7e7);
  border-radius: 5px;
  color: #838374;
  text-shadow: 0px 1px white, 0px -1px 1px #979e90;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0px;
  position: relative;
  will-change: transform;
  margin-top: -7px;
  transition: transform 100ms;
  &:focus {
    outline: none;
  }
  &:hover {
    transform: translateY(-2px);
  }
  &:active {
    transform: translateY(2px);
  }
`;

const ButtonBottom = styled('div')`
  content: "";
  width: 100%;
  height: 10px;
  border-radius: 0px 0px 5px 5px;
  position: absolute;
  left: 0px;
  bottom: -4px;
  ${'' /* background: #b6b596; */}
  z-index: -1;
  ${'' /* border: 1px solid rgba(0,0,0,.5); */}
  background: linear-gradient(to right, #d2d2b7 0%, #b6b596 7%, #b6b596 93%, #d2d2b7 100%);
`

const Circle = styled("div")`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 55px;
  height: 55px;
  border-radius: 100%;
  background: linear-gradient(to bottom, #dddcc0, #f7f7e7);
  ${'' /* border: 2px solid rgba(255,255,255,.2); */}
`

ReactDOM.render(<App />, document.getElementById("root"));
