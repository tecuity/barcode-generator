import React from "react";
import styled from "@emotion/styled";
import { keyframes, css } from "@emotion/core";
import quotes from './quotes'

export default ({ svg }) => {
  const [currentBarcodeSVG, setCurrentBarcodeSVG] = React.useState(svg);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [isTearing, setIsTearing] = React.useState(false);
  const [currentQuote, setCurrentQuote] = React.useState(0)

  React.useEffect(() => {
    if (prevSVG.current === null && svg) {
      setCurrentBarcodeSVG(svg);
      setIsPrinting(true);
    } else if (prevSVG.current !== null && prevSVG.current !== undefined) {
      setIsTearing(true);
    }
  }, [svg]);

  const prevSVG = React.useRef();
  React.useEffect(() => {
    prevSVG.current = svg;
  });

  const handleAnimationEnd = () => {
    if (isTearing) {
      setCurrentQuote(x => x === quotes.length - 1 ? 0 : x + 1)
      setIsTearing(false);
      setCurrentBarcodeSVG(svg);
    }
  };

  const handleTransitionEnd = () => {
    if (isPrinting) {
      setIsPrinting(false);
    }
  };

  return (
    <Wrapper>
      <Slot>
        <Cutter />
      </Slot>
      <ReceiptPositioner>
        <ReceiptHider>
          <ReceiptColumn show={isPrinting && !isTearing}>
            <ReceiptPaper
              printing={isPrinting}
              tearing={isTearing}
              onAnimationEnd={handleAnimationEnd}
              onTransitionEnd={handleTransitionEnd}
            >
              <Quote>
                {quotes[currentQuote]}
              </Quote>
              <BarcodeWrapper>
                <Barcode src={currentBarcodeSVG} alt="" />
              </BarcodeWrapper>
              {/* <ReceiptShadow /> */}
            </ReceiptPaper>
          </ReceiptColumn>
        </ReceiptHider>
      </ReceiptPositioner>
    </Wrapper>
  );
};

const Wrapper = styled("div")`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
`;

const BarcodeWrapper = styled("div")`
  width: 100%;
  padding: 15px;
`;

const Barcode = styled("img")`
  width: 100%;
  max-height: 100px;
`;

const Slot = styled("div")`
  width: 400px;
  height: 10px;
  background: linear-gradient(
    to right,
    rgb(65, 65, 65) 0%,
    rgb(31, 31, 31) 2%,
    rgb(31, 31, 31) 98%,
    rgb(65, 65, 65) 100%
  );
  box-shadow: inset 0px -4px 4px rgba(255, 255, 255, 0.1),
    inset 0px 3px 3px rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  position: relative;
`;

const Cutter = styled("div")`
  position: absolute;
  left: 15px;
  bottom: 0px;
  width: calc(100% - 30px);
  height: 1px;
  background: #d7d7d7;
  &::after {
    background: linear-gradient(-45deg, #ffffff 2px, transparent 0),
      linear-gradient(45deg, #d7d7d7 2px, transparent 0);
    background-position: left-bottom;
    background-repeat: repeat-x;
    background-size: 4px 4px;
    content: " ";
    display: block;
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    height: 4px;
  }
`;

const ReceiptPositioner = styled("div")`
  width: 100%;
  height: 39px;
  position: absolute;
  left: 0px;
  bottom: 0px;
  display: flex;
  justify-content: center;
`;

const ReceiptHider = styled("div")`
  width: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  height: 450px;
`;

const ReceiptColumn = styled("div")`
  display: flex;
  align-items: center;
  flex-direction: column;
  position: relative;
  &::after{
    content: "";
    width: 340px;
    height: 30px;
    background: linear-gradient(to bottom, rgba(0,0,0,.3), rgba(0,0,0,0));
    position: absolute;
    left: 0px;
    top: 0px;
    z-index: 9;
    transition: opacity 500ms;
    opacity: ${({show}) => show ? 1 : 0};
  }
`;

const printPaper = keyframes`
  0%{
    transform: translateY(-100%);
  }
  100%{
    transform: translateY(0%);
  }
`;

const tearPaper = keyframes`
  0%{
    transform: translateY(0%) rotate(0deg);
  }
  25%{
    transform: translateY(3%) rotate(3deg);
  }
  65%{
    opacity: 1;
  }
  100%{
    transform: translateY(100%) rotate(10deg);
    opacity: 0;
  }
`;

const ReceiptPaper = styled("div")`
  width: 340px;
  background: #fff;
  position: relative;
  box-shadow: 0px 10px 10px -4px rgba(0, 0, 0, 0.2);
  transform: translateY(-100%);
  z-index: 3;
  animation: ${({ tearing, printing }) =>
    tearing
      ? css`
          ${tearPaper} 700ms
        `
      : printing
      ? css`
          ${printPaper} 1000ms
        `
      : ""};
  animation-fill-mode: forwards;
  animation-timing-function: linear;
  transform-origin: top left;
  &::after {
    background: linear-gradient(-45deg, white 4px, transparent 0),
      linear-gradient(45deg, white 4px, transparent 0);
    transform: rotate(180deg);
    background-position: left-bottom;
    background-repeat: repeat-x;
    background-size: 8px 8px;
    content: " ";
    display: block;
    position: absolute;
    bottom: -8px;
    left: 0px;
    width: 100%;
    height: 8px;
  }
  &::before {
    background: linear-gradient(-45deg, white 4px, transparent 0),
    linear-gradient(45deg, white 4px, transparent 0);
    background-position: left-bottom;
    background-repeat: repeat-x;
    background-size: 8px 8px;
    content: " ";
    display: block;
    position: absolute;
    top: -8px;
    left: 0px;
    width: 100%;
    height: 8px;
  }
`;

const Quote = styled('p')`
  font-family: "VT323", monospace;
  white-space: pre-wrap;
  margin: 0px;
  padding: 15px;
  font-size: 24px;
  padding-bottom: 0px;
`

// const ReceiptShadow = styled("div")`
//   position: absolute;
//   width: calc(100% + 20px);
//   height: 100%;
//   background: rgba(0, 0, 0, 0.2);
//   filter: blur(15px);
//   left: -10px;
//   top: 0px;
//   content: "";
//   transform: perspective(1000px) rotateX(-30deg);
//   z-index: -2;
// `;
