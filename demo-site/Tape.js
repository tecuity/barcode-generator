import React from 'react'
import styled from '@emotion/styled'

export default ({ svg }) => {
  return (
    svg ?
    <Wrapper>
      <img src={svg} alt="" />
    </Wrapper>
    : null
  )
}

const Wrapper = styled('div')`
  display: flex;
  margin-top: 100px;
  justify-content: center;
`
