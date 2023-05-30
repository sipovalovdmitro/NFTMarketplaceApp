import React, { useState } from "react";
import MEWconnect from "@myetherwallet/mewconnect-web-client"
import Web3Modal from 'web3modal';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';

import { userLike, userUnlike } from "../../api/user"

const Like = (props) => {
  const address = props.address
  const collectionId = props.collectionId
  const isCollectionPage = props.isCollectionPage ? props.isCollectionPage : props.isCollectionPage
  const [liked, setLiked] = useState(props.isLiked);
  const [likesCount, setLikesCount] = useState(props.likes_count);

  const like = async () => {
    const token = document.querySelector('[name=csrf-token]').content
    await userLike(address, collectionId, token)
    setAll(true, likesCount+1)
  }

  const unlike = async () => {
    const token = document.querySelector('[name=csrf-token]').content
    await userUnlike(address, collectionId, token)
    setAll(false, likesCount-1)
  }

  const setAll = (likeStatus, likesCount, userLike) => {
    setLiked(likeStatus)
    setLikesCount(likesCount);
  }

  const initLike = async (e) => {
    e.preventDefault()
    if (liked) {
      await unlike()
    } else {
      await like()
    }
  }


  return (
    <React.Fragment>
      {!isCollectionPage &&
          <button  onClick={initLike} className={`card__likes heart ${liked ? 'is-active' : ''}`}>
                       <i className="far fa-heart"></i>
                       <i className="fas fa-heart"></i>
                             <span>{likesCount}</span>
              </button>
      }

      {isCollectionPage &&
        <button  onClick={initLike} className={`card__likes heart ${liked ? 'is-active' : ''}`}>
                              <i className="far fa-heart"></i>
                              <i className="fas fa-heart"></i>
                                    <span>{likesCount}</span>
                     </button>
      }
    </React.Fragment>
  );
}


export default Like