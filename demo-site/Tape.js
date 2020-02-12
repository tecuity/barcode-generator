import React from 'react'
import styled from '@emotion/styled'

export default ({ svg }) => {
  return (
    svg ?
    <Wrapper>
      <Barcode src={svg} alt="" />
    </Wrapper>
    : null
  )
}

const Wrapper = styled('div')`
  display: flex;
  margin-top: 100px;
  justify-content: center;
  width: 500px;
`

const Barcode = styled('img')`
  width: 100%;
  max-height: 130px;
`
