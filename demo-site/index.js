import React from "react";
import ReactDOM from "react-dom";
import styled from "@emotion/styled";
import generateBarcode from '../dist/index.js'
import Tape from './Tape'
import "normalize.css";
import "./index.css";

const App = () => {
  const [code, setCode] = React.useState("");
  const [svg, setSvg] = React.useState(null)

  const generate = () => {
    setSvg(generateBarcode(code))
  }

  return (
    <Wrapper>
      <Column>
        <Title>Barcode Generator</Title>
        <Row>
          <Input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          <Button onClick={generate}>GO</Button>
        </Row>
        <Tape svg={svg} />
      </Column>
    </Wrapper>
  );
};

const Wrapper = styled("div")`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const Column = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 100px;
`

const Row = styled('div')`
  display: flex;
  align-items: center;
  padding: 10px;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 5px;
  background: #efeeee;
  box-shadow: -6px -6px 16px rgba(255,255,255,.7),
              6px 6px 16px #d1cdc780
`

const Title = styled("h1")`
  font-family: "Montserrat", sans-serif;
  font-weight: 300;
  margin-bottom: 50px;
`;

const Input = styled('input')`
  border: 1px solid rgba(255,255,255,.3);
  background: none;
  border-radius: 5px;
  box-shadow: inset 0px 7px 15px -5px rgba(0,0,0,.2), inset 0px -7px 15px -5px rgba(255,255,255,1);
  font-size: 40px;
  width: 400px;
  height: 70px;
  padding: 10px;
  text-align: center;
  margin-right: 10px;
  &:focus{
    background: rgba(255,255,255,.2);
    outline: none;
  }
`

const Button = styled('button')`
  font-size: 35px;
  font-weight: 600;
  text-transform: uppercase;
  height: 70px;
  border: none;
  background: linear-gradient(to bottom, #95C93D, #88ba33);
  border-radius: 5px;
  padding: 12px;
  color: #fff;
  text-shadow: 0px 1px white, 0px -1px 1px #979e90;
  &:focus{
    outline: none;
  }
  &:hover{
    background: linear-gradient(to bottom, #a6dd4a, #99cd41);
  }
`

ReactDOM.render(<App />, document.getElementById("root"));
