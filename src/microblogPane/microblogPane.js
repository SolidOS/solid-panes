/*
 Microblog pane
 Charles McKenzie <charles2@mit.edu>
*/
/* global alert */
const UI = require('solid-ui')

module.exports = {
  icon: UI.icons.originalIconBase + 'microblog/microblog.png',
  name: 'microblogPane',
  label: function (subject) {
    if (UI.store.whether(subject, UI.ns.rdf('type'), UI.ns.foaf('Person'))) {
      return 'Microblog'
    } else {
      return null
    }
  },
  render: function (s, doc) {
    //* **********************************************
    // NAMESPACES  SECTION
    //* **********************************************
    const SIOC = UI.rdf.Namespace('http://rdfs.org/sioc/ns#')
    const SIOCt = UI.rdf.Namespace('http://rdfs.org/sioc/types#')
    const FOAF = UI.rdf.Namespace('http://xmlns.com/foaf/0.1/')
    const terms = UI.rdf.Namespace('http://purl.org/dc/terms/')
    const RDF = UI.ns.rdf

    const kb = UI.store
    const charCount = 140
    const sf = UI.store.fetcher
    //* **********************************************
    // BACK END
    //* **********************************************
    const sparqlUpdater = kb.updater
    // ----------------------------------------------
    // FOLLOW LIST
    // store the URIs of followed users for
    // dereferencing the @replies
    // ----------------------------------------------
    const FollowList = function (user) {
      this.userlist = {}
      this.uris = {}
      const myFollows = kb.each(kb.sym(user), SIOC('follows'))
      for (const mf in myFollows) {
        this.add(kb.any(myFollows[mf], SIOC('id')), myFollows[mf].uri)
      }
    }
    FollowList.prototype.add = function (user, uri) {
      // add a user to the follows store
      if (this.userlist[user]) {
        if (!(uri in this.uris)) {
          this.userlist[user].push(uri)
          this.uris[uri] = ''
        }
      } else {
        this.userlist[user] = [uri]
      }
    }
    FollowList.prototype.selectUser = function (user) {
      // check if a user is in the follows list.
      if (this.userlist[user]) {
        return [this.userlist[user].length === 1, this.userlist[user]]
      } else {
        // user does not follow any users with this nick
        return [false, []]
      }
    }
    // ----------------------------------------------
    // FAVORITES
    // controls the list of favorites.
    // constructor expects a user as uri.
    // ----------------------------------------------
    const Favorites = function (user) {
      this.favorites = {}
      this.favoritesURI = ''
      if (!user) {
        // TODO is this even useful?
        return
      }
      this.user = user.split('#')[0]
      const created = kb.each(kb.sym(user), SIOC('creator_of'))
      for (const c in created) {
        if (kb.whether(created[c], RDF('type'), SIOCt('FavouriteThings'))) {
          this.favoritesURI = created[c]
          const favs = kb.each(created[c], SIOC('container_of'))
          for (const f in favs) {
            this.favorites[favs[f]] = ''
          }
          break
        }
      }
    }
    Favorites.prototype.favorited = function (post) {
      /* Favorited- returns true if the post is a favorite
      false otherwise */
      return kb.sym(post) in this.favorites
    }
    Favorites.prototype.add = function (post, callback) {
      const batch = new UI.rdf.Statement(
        this.favoritesURI,
        SIOC('container_of'),
        kb.sym(post),
        kb.sym(this.user)
      )
      sparqlUpdater.insert_statement(batch, function (a, success, c) {
        if (success) {
          kb.add(batch.subject, batch.predicate, batch.object, batch.why)
        }
        callback(a, success, c)
      })
    }
    Favorites.prototype.remove = function (post, callback) {
      const batch = new UI.rdf.Statement(
        this.favoritesURI,
        SIOC('container_of'),
        kb.sym(post),
        kb.sym(this.user)
      )
      sparqlUpdater.delete_statement(batch, function (a, success, c) {
        if (success) {
          kb.add(batch.subject, batch.predicate, batch.object, batch.why)
        }
        callback(a, success, c)
      })
    }
    // ----------------------------------------------
    // MICROBLOG
    // store the uri's of followed users for
    // dereferencing the @replies.
    // ----------------------------------------------
    const Microblog = function (kb) {
      this.kb = kb

      // attempt to fetch user account from local preferences if just
      // in case the user's foaf was not writable. add it to the store
      // this will probably need to change.
      const theUser = UI.authn.currentUser()

      if (theUser) {
        let theAccount = UI.preferences.get('acct')

        if (theAccount) {
          theAccount = kb.sym(theAccount)
        }

        if (theUser && theAccount) {
          kb.add(
            theUser,
            FOAF('holdsAccount'),
            theAccount,
            theUser.uri.split('#')[0]
          )
        }
      }
    }
    Microblog.prototype.getUser = function (uri) {
      const User = {}
      User.name = kb.any(uri, SIOC('name')) ? kb.any(uri, SIOC('name')) : ''
      User.avatar = kb.any(uri, SIOC('avatar'))
        ? kb.any(uri, SIOC('avatar'))
        : ''
      User.id = kb.any(uri, SIOC('id'))
      User.sym = uri
      return User
    }

    Microblog.prototype.getPost = function (uri) {
      const Post = {}
      // date ----------
      let postLink = new Date(kb.anyValue(uri, terms('created')))
      let h = postLink.getHours()
      const a = h > 12 ? ' PM' : ' AM'
      h = h > 12 ? h - 12 : h
      let m = postLink.getMinutes()
      m = m < 10 ? '0' + m : m
      const mo = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ]
      const da = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const ds =
        da[postLink.getDay()] +
        ' ' +
        postLink.getDate() +
        ' ' +
        mo[postLink.getMonth()] +
        ' ' +
        postLink.getFullYear()
      postLink = h + ':' + m + a + ' on ' + ds
      Post.date = postLink
      // ---------
      Post.mentions = ''
      Post.message = String(kb.any(uri, SIOC('content')))
      Post.creator = kb.any(uri, SIOC('has_creator'))
      Post.uri = ''
      return Post
    }
    Microblog.prototype.gen_random_uri = function (base) {
      // generate random uri
      const uriNonce = base + '#n' + Math.floor(Math.random() * 10e9)
      return kb.sym(uriNonce)
    }
    Microblog.prototype.statusUpdate = function (
      statusMsg,
      callback,
      replyTo,
      meta
    ) {
      const myUserURI = this.getMyURI()
      const myUser = kb.sym(myUserURI.split('#')[0])
      const newPost = this.gen_random_uri(myUser.uri)
      const microlist = kb.each(kb.sym(myUserURI), SIOC('creator_of'))
      let micro
      for (const microlistelement in microlist) {
        if (
          kb.whether(
            microlist[microlistelement],
            RDF('type'),
            SIOCt('Microblog')
          ) &&
          !kb.whether(
            microlist[microlistelement],
            SIOC('topic'),
            kb.sym(this.getMyURI())
          )
        ) {
          micro = microlist[microlistelement]
          break
        }
      }

      // generate new post
      const batch = [
        new UI.rdf.Statement(
          newPost,
          RDF('type'),
          SIOCt('MicroblogPost'),
          myUser
        ),
        new UI.rdf.Statement(
          newPost,
          SIOC('has_creator'),
          kb.sym(myUserURI),
          myUser
        ),
        new UI.rdf.Statement(newPost, SIOC('content'), statusMsg, myUser),
        new UI.rdf.Statement(newPost, terms('created'), new Date(), myUser),
        new UI.rdf.Statement(micro, SIOC('container_of'), newPost, myUser)
      ]

      // message replies
      if (replyTo) {
        batch.push(
          new UI.rdf.Statement(
            newPost,
            SIOC('reply_of'),
            kb.sym(replyTo),
            myUser
          )
        )
      }

      // @replies, #hashtags, !groupReplies
      for (const r in meta.recipients) {
        batch.push(
          new UI.rdf.Statement(
            newPost,
            SIOC('topic'),
            kb.sym(meta.recipients[r]),
            myUser
          )
        )
        batch.push(
          new UI.rdf.Statement(kb.any(), SIOC('container_of'), newPost, myUser)
        )
        const mblogs = kb.each(kb.sym(meta.recipients[r]), SIOC('creator_of'))
        for (const mbl in mblogs) {
          if (
            kb.whether(mblogs[mbl], SIOC('topic'), kb.sym(meta.recipients[r]))
          ) {
            const replyBatch = new UI.rdf.Statement(
              mblogs[mbl],
              SIOC('container_of'),
              newPost,
              kb.sym(meta.recipients[r].split('#')[0])
            )
            sparqlUpdater.insert_statement(replyBatch)
          }
        }
      }

      sparqlUpdater.insert_statement(batch, function (a, b, c) {
        callback(a, b, c, batch)
      })
    }
    Microblog.prototype.getMyURI = function () {
      const me = UI.authn.currentUser()
      console.log(me)
      const myMicroblog = kb.any(kb.sym(me), FOAF('holdsAccount'))
      console.log('\n\n' + myMicroblog)
      return myMicroblog ? myMicroblog.uri : false
    }
    Microblog.prototype.generateNewMB = function (id, name, avatar, loc) {
      const host = loc + '/' + id
      const rememberMicroblog = function () {
        UI.preferences.set('acct', host + '#' + id)
      }
      const cbgenUserMB = function (a, success, c, d) {
        if (success) {
          alert(
            'Microblog generated at ' +
              host +
              '#' +
              id +
              'please add <b>' +
              host +
              '</b> to your foaf.'
          )
          // mbCancelNewMB()   @@TBD
          // assume the foaf is not writable and store the microblog to the
          // preferences for later retrieval.
          // this will probably need to change.
          rememberMicroblog()
          for (const triple in d) {
            kb.add(
              d[triple].subject,
              d[triple].predicate,
              d[triple].object,
              d[triple].why
            )
          }
        }
      }

      const genUserMB = [
        // user
        new UI.rdf.Statement(
          kb.sym(host + '#' + id),
          RDF('type'),
          SIOC('User'),
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#' + id),
          SIOC('creator_of'),
          kb.sym(host + '#mb'),
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#' + id),
          SIOC('creator_of'),
          kb.sym(host + '#mbn'),
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#' + id),
          SIOC('creator_of'),
          kb.sym(host + '#fav'),
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#' + id),
          SIOC('name'),
          name,
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#' + id),
          SIOC('id'),
          id,
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#' + id),
          RDF('label'),
          id,
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          s,
          FOAF('holdsAccount'),
          kb.sym(host + '#' + id),
          kb.sym(host)
        ),
        // microblog
        new UI.rdf.Statement(
          kb.sym(host + '#mb'),
          RDF('type'),
          SIOCt('Microblog'),
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#mb'),
          SIOC('has_creator'),
          kb.sym(host + '#' + id),
          kb.sym(host)
        ),
        // notification microblog
        new UI.rdf.Statement(
          kb.sym(host + '#mbn'),
          RDF('type'),
          SIOCt('Microblog'),
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#mbn'),
          SIOC('topic'),
          kb.sym(host + '#' + id),
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#mbn'),
          SIOC('has_creator'),
          kb.sym(host + '#' + id),
          kb.sym(host)
        ),
        // favorites container
        new UI.rdf.Statement(
          kb.sym(host + '#fav'),
          RDF('type'),
          SIOCt('FavouriteThings'),
          kb.sym(host)
        ),
        new UI.rdf.Statement(
          kb.sym(host + '#fav'),
          SIOC('has_creator'),
          kb.sym(host + '#' + id),
          kb.sym(host)
        )
      ]
      if (avatar) {
        // avatar optional
        genUserMB.push(
          new UI.rdf.Statement(
            kb.sym(host + '#' + id),
            SIOC('avatar'),
            kb.sym(avatar),
            kb.sym(host)
          )
        )
      }
      sparqlUpdater.insert_statement(genUserMB, cbgenUserMB)
    }
    const mb = new Microblog(kb)
    const myFavorites = new Favorites(mb.getMyURI())
    const myFollowList = new FollowList(mb.getMyURI())

    //* **********************************************
    // FRONT END FUNCTIONALITY
    //* **********************************************
    // ----------------------------------------------
    // PANE
    // User Interface for the Microblog Pane
    // ----------------------------------------------
    const Pane = function (s, doc, microblogPane) {
      const TabManager = function (doc) {
        this.tablist = {}
        this.doc = doc
        this.tabView = doc.createElement('ul')
        this.tabView.className = 'tabslist'
      }
      TabManager.prototype.create = function (id, caption, view, isDefault) {
        const tab = this.doc.createElement('li')
        tab.innerHTML = caption
        if (isDefault) {
          tab.className = 'active'
        }
        tab.id = id
        const change = this.change
        const tablist = this.tablist
        tab.addEventListener(
          'click',
          function (evt) {
            change(evt.target.id, tablist, doc)
          },
          false
        )

        this.tablist[id] = { view: view.id, tab: tab }
        this.tabView.appendChild(tab)
      }
      TabManager.prototype.getTabView = function () {
        return this.tabView
      }
      TabManager.prototype.change = function (id, tablist, doc) {
        for (const tab in tablist) {
          if (tab === id) {
            tablist[id].tab.className = 'active'
            doc.getElementById(tablist[id].view).className += ' active'
          } else {
            const view = doc.getElementById(tablist[tab].view)
            view.className = view.className.replace(/\w*active\w*/, '')
            tablist[tab].tab.className = tablist[id].tab.className.replace(
              /\w*active\w*/,
              ''
            )
          }
        }
      }
      this.microblogPane = microblogPane
      const accounts = kb.each(s, FOAF('holdsAccount'))
      for (const a in accounts) {
        if (
          kb.whether(accounts[a], RDF('type'), SIOC('User')) &&
          kb.whether(
            kb.any(accounts[a], SIOC('creator_of')),
            RDF('type'),
            SIOCt('Microblog')
          )
        ) {
          var account = accounts[a]
          break
        }
      }
      this.Ifollow = kb.whether(kb.sym(mb.getMyURI()), SIOC('follows'), account)
      const resourceType = kb.any(s, RDF('type'))
      if (
        resourceType.uri === SIOCt('Microblog').uri ||
        resourceType.uri === SIOCt('MicroblogPost').uri
      ) {
        this.thisIsMe = kb.any(s, SIOC('has_creator')).uri === mb.getMyURI()
      } else if (resourceType.uri === SIOC('User').uri) {
        this.thisIsMe = s.uri === mb.getMyURI()
      } else if (resourceType.uri === FOAF('Person').uri) {
        const me = UI.authn.currentUser()
        const meUri = me && me.uri
        this.thisIsMe = s.uri === meUri
      } else {
        this.thisIsMe = false
      }

      this.Tab = new TabManager(doc)
    }

    Pane.prototype.notify = function (messageString) {
      const xmsg = doc.createElement('li')
      xmsg.className = 'notify'
      xmsg.innerHTML = messageString
      doc.getElementById('notify-container').appendChild(xmsg)
      setTimeout(function () {
        doc.getElementById('notify-container').removeChild(xmsg)
        // delete xmsg;
      }, 4000)
    }

    Pane.prototype.header = function (s, doc) {
      const that = this
      function lsFollowUser () {
        const myUser = kb.sym(mb.getMyURI())
        // var Ifollow = that.Ifollow
        const username = that.creator.name
        const mbconfirmFollow = function (uri, success, _msg) {
          if (success === true) {
            if (!that.Ifollow) {
              // prevent duplicate entries from being added to kb (because that was happening)
              if (
                !kb.whether(
                  followMe.subject,
                  followMe.predicate,
                  followMe.object,
                  followMe.why
                )
              ) {
                kb.add(
                  followMe.subject,
                  followMe.predicate,
                  followMe.object,
                  followMe.why
                )
              }
            } else {
              kb.removeMany(
                followMe.subject,
                followMe.predicate,
                followMe.object,
                followMe.why
              )
            }
            console.log(that.Ifollow)
            that.Ifollow = !that.Ifollow
            xfollowButton.disabled = false
            console.log(that.Ifollow)
            const followButtonLabel = that.Ifollow ? 'Unfollow ' : 'Follow '
            const doFollow = that.Ifollow ? 'now follow ' : 'no longer follow '
            xfollowButton.value = followButtonLabel + username
            that.notify('You ' + doFollow + username + '.')
          }
        }
        var followMe = new UI.rdf.Statement(
          myUser,
          SIOC('follows'),
          that.creator.sym,
          myUser
        )
        xfollowButton.disabled = true
        xfollowButton.value = 'Updating...'
        if (!that.Ifollow) {
          sparqlUpdater.insert_statement(followMe, mbconfirmFollow)
        } else {
          sparqlUpdater.delete_statement(followMe, mbconfirmFollow)
        }
      }
      const notify = function (messageString) {
        const xmsg = doc.createElement('li')
        xmsg.className = 'notify'
        xmsg.innerHTML = messageString
        doc.getElementById('notify-container').appendChild(xmsg)
        setTimeout(function () {
          doc.getElementById('notify-container').removeChild(xmsg)
          // delete xmsg;
        }, 4000)
      }
      const mbCancelNewMB = function (_evt) {
        xupdateContainer.removeChild(
          xupdateContainer.childNodes[xupdateContainer.childNodes.length - 1]
        )
        xcreateNewMB.disabled = false
      }
      const lsCreateNewMB = function (_evt) {
        // disable the create new microblog button.
        // then prefills the information.
        xcreateNewMB.disabled = true
        const xcmb = doc.createElement('div')
        const xcmbName = doc.createElement('input')
        if (kb.whether(s, FOAF('name'))) {
          // handle use of FOAF:NAME
          xcmbName.value = kb.any(s, FOAF('name'))
        } else {
          // handle use of family and given name
          xcmbName.value = kb.any(s, FOAF('givenname'))
            ? kb.any(s, FOAF('givenname')) + ' '
            : ''
          xcmbName.value += kb.any(s, FOAF('family_name'))
            ? kb.any(s, FOAF('givenname'))
            : ''
          xcmbName.value =
            kb.any(s, FOAF('givenname')) + ' ' + kb.any(s, FOAF('family_name'))
        }
        const xcmbId = doc.createElement('input')
        xcmbId.value = kb.any(s, FOAF('nick')) ? kb.any(s, FOAF('nick')) : ''
        const xcmbAvatar = doc.createElement('input')
        if (kb.whether(s, FOAF('img'))) {
          // handle use of img
          xcmbAvatar.value = kb.any(s, FOAF('img')).uri
        } else {
          // otherwise try depiction
          xcmbAvatar.value = kb.any(s, FOAF('depiction'))
            ? kb.any(s, FOAF('depiction')).uri
            : ''
        }
        let workspace
        // = kb.any(s,WORKSPACE) //TODO - ADD URI FOR WORKSPACE DEFINITION
        const xcmbWritable = doc.createElement('input')
        xcmbWritable.value =
          workspace || 'http://dig.csail.mit.edu/2007/wiki/sandbox' // @@@
        xcmb.innerHTML = `
                        <form class ="createNewMB" id="createNewMB">
                            <p id="xcmbname"><span class="">Name: </span></p>
                            <p id="xcmbid">Id: </p>
                            <p id="xcmbavatar">Avatar: </p>
                            <p id="xcmbwritable">Host my microblog at: </p>
                            <input type="button" id="mbCancel" value="Cancel" />
                            <input type="submit" id="mbCreate" value="Create!" />
                        </form>
                        `
        xupdateContainer.appendChild(xcmb)
        doc.getElementById('xcmbname').appendChild(xcmbName)
        doc.getElementById('xcmbid').appendChild(xcmbId)
        doc.getElementById('xcmbavatar').appendChild(xcmbAvatar)
        doc.getElementById('xcmbwritable').appendChild(xcmbWritable)
        doc
          .getElementById('mbCancel')
          .addEventListener('click', mbCancelNewMB, false)
        doc.getElementById('createNewMB').addEventListener(
          'submit',
          function () {
            mb.generateNewMB(
              xcmbId.value,
              xcmbName.value,
              xcmbAvatar.value,
              xcmbWritable.value
            )
          },
          false
        )
        xcmbName.focus()
      }
      const mbSubmitPost = function () {
        const meta = {
          recipients: []
        }
        // user has selected a microblog to post to
        if (mb.getMyURI()) {
          // let myUser = kb.sym(mb.getMyURI())
          // submission callback
          const cbconfirmSubmit = function (uri, success, responseText, d) {
            if (success === true) {
              for (const triple in d) {
                kb.add(
                  d[triple].subject,
                  d[triple].predicate,
                  d[triple].object,
                  d[triple].why
                )
              }
              xupdateSubmit.disabled = false
              xupdateStatus.value = ''
              mbLetterCount()
              notify('Microblog Updated.')
              if (that.thisIsMe) {
                doc
                  .getElementById('postNotificationList')
                  .insertBefore(
                    that.generatePost(d[0].subject),
                    doc.getElementById('postNotificationList').childNodes[0]
                  )
              }
            } else {
              notify('There was a problem submitting your post.')
            }
          }
          const words = xupdateStatus.value.split(' ')
          const mbUpdateWithReplies = function () {
            xupdateSubmit.disabled = true
            xupdateSubmit.value = 'Updating...'
            mb.statusUpdate(
              xupdateStatus.value,
              cbconfirmSubmit,
              xinReplyToContainer.value,
              meta
            )
          }
          for (const word in words) {
            if (words[word].match(/@\w+/)) {
              const atUser = words[word].replace(/\W/g, '')
              var recipient = myFollowList.selectUser(atUser)
              if (recipient[0] === true) {
                meta.recipients.push(recipient[1][0])
              } else if (recipient[1].length > 1) {
                // if  multiple users allow the user to choose
                var xrecipients = doc.createElement('select')
                var xrecipientsSubmit = doc.createElement('input')
                xrecipientsSubmit.type = 'button'
                xrecipientsSubmit.value = 'Continue'
                xrecipientsSubmit.addEventListener(
                  'click',
                  function () {
                    meta.recipients.push(recipient[1][xrecipients.value])
                    mbUpdateWithReplies()
                    xrecipients.parentNode.removeChild(xrecipientsSubmit)
                    xrecipients.parentNode.removeChild(xrecipients)
                  },
                  false
                )
                const recipChoice = function (recip, c) {
                  const name = kb.any(kb.sym(recip), SIOC('name'))
                  const choice = doc.createElement('option')
                  choice.value = c
                  choice.innerHTML = name
                  return choice
                }
                for (const r in recipient[1]) {
                  xrecipients.appendChild(recipChoice(recipient[1][r], r))
                }
                xupdateContainer.appendChild(xrecipients)
                xupdateContainer.appendChild(xrecipientsSubmit)
                return
              } else {
                // no users known or self reference.
                if (
                  String(
                    kb.any(kb.sym(mb.getMyURI()), SIOC('id'))
                  ).toLowerCase() === atUser.toLowerCase()
                ) {
                  meta.recipients.push(mb.getMyURI())
                } else {
                  notify(
                    'You do not follow ' +
                      atUser +
                      '. Try following ' +
                      atUser +
                      ' before mentioning them.'
                  )
                  return
                }
              }
            }
            /* else if(words[word].match(/\#\w+/)){
                //hashtag
            } else if(words[word].match(/\!\w+/)){
                //usergroup
            } */
          }
          mbUpdateWithReplies()
        } else {
          notify('Please set your microblog first.')
        }
      }
      var mbLetterCount = function () {
        xupdateStatusCounter.innerHTML = charCount - xupdateStatus.value.length
        xupdateStatusCounter.style.color =
          charCount - xupdateStatus.value.length < 0 ? '#c33' : ''
        if (xupdateStatus.value.length === 0) {
          xinReplyToContainer.value = ''
          xupdateSubmit.value = 'Send'
        }
      }
      // reply viewer
      const xviewReply = doc.createElement('ul')
      xviewReply.className = 'replyView'
      xviewReply.addEventListener(
        'click',
        function () {
          xviewReply.className = 'replyView'
        },
        false
      )
      this.xviewReply = xviewReply
      const headerContainer = doc.createElement('div')
      headerContainer.className = 'header-container'

      // ---create status update box---
      const xnotify = doc.createElement('ul')
      xnotify.id = 'notify-container'
      xnotify.className = 'notify-container'
      this.xnotify = xnotify
      var xupdateContainer = doc.createElement('form')
      xupdateContainer.className = 'update-container'
      xupdateContainer.innerHTML = '<h3>What are you up to?</h3>'
      if (mb.getMyURI()) {
        var xinReplyToContainer = doc.createElement('input')
        xinReplyToContainer.id = 'xinReplyToContainer'
        xinReplyToContainer.type = 'hidden'

        var xupdateStatus = doc.createElement('textarea')
        xupdateStatus.id = 'xupdateStatus'

        var xupdateStatusCounter = doc.createElement('span')
        xupdateStatusCounter.appendChild(doc.createTextNode(charCount))
        xupdateStatus.cols = 30
        xupdateStatus.addEventListener('keyup', mbLetterCount, false)
        xupdateStatus.addEventListener('focus', mbLetterCount, false)

        var xupdateSubmit = doc.createElement('input')
        xupdateSubmit.id = 'xupdateSubmit'
        xupdateSubmit.type = 'submit'
        xupdateSubmit.value = 'Send'

        xupdateContainer.appendChild(xinReplyToContainer)
        xupdateContainer.appendChild(xupdateStatusCounter)
        xupdateContainer.appendChild(xupdateStatus)
        xupdateContainer.appendChild(xupdateSubmit)
        xupdateContainer.addEventListener('submit', mbSubmitPost, false)
      } else {
        const xnewUser = doc.createTextNode(
          "Hi, it looks like you don't have a microblog, " +
            ' would you like to create one? '
        )
        var xcreateNewMB = doc.createElement('input')
        xcreateNewMB.type = 'button'
        xcreateNewMB.value = 'Create a new Microblog'
        xcreateNewMB.addEventListener('click', lsCreateNewMB, false)
        xupdateContainer.appendChild(xnewUser)
        xupdateContainer.appendChild(xcreateNewMB)
      }

      headerContainer.appendChild(xupdateContainer)

      const subheaderContainer = doc.createElement('div')
      subheaderContainer.className = 'subheader-container'

      // user header
      // this.creator
      const creators = kb.each(s, FOAF('holdsAccount'))
      for (const c in creators) {
        if (
          kb.whether(creators[c], RDF('type'), SIOC('User')) &&
          kb.whether(
            kb.any(creators[c], SIOC('creator_of')),
            RDF('type'),
            SIOCt('Microblog')
          )
        ) {
          var creator = creators[c]
          // var mb = kb.sym(creator.uri.split("#")[0]);
          // UI.store.fetcher.refresh(mb);
          break
          // TODO add support for more than one microblog in same foaf
        }
      }
      if (creator) {
        this.creator = mb.getUser(creator)
        // ---display avatar, if available ---
        if (this.creator.avatar !== '') {
          const avatar = doc.createElement('img')
          avatar.src = this.creator.avatar.uri
          subheaderContainer.appendChild(avatar)
        }
        // ---generate name ---
        const userName = doc.createElement('h1')
        userName.className = 'fn'
        userName.appendChild(
          doc.createTextNode(this.creator.name + ' (' + this.creator.id + ')')
        )
        subheaderContainer.appendChild(userName)
        // ---display follow button---
        if (!this.thisIsMe && mb.getMyURI()) {
          var xfollowButton = doc.createElement('input')
          xfollowButton.setAttribute('type', 'button')
          const followButtonLabel = this.Ifollow ? 'Unfollow ' : 'Follow '
          xfollowButton.value = followButtonLabel + this.creator.name
          xfollowButton.addEventListener('click', lsFollowUser, false)
          subheaderContainer.appendChild(xfollowButton)
        }
        // user header end
        // header tabs
        const xtabsList = this.Tab.getTabView()
        headerContainer.appendChild(subheaderContainer)
        headerContainer.appendChild(xtabsList)
      }
      return headerContainer
    }
    Pane.prototype.generatePost = function (post, _me) {
      /*
      generatePost - Creates and formats microblog posts
          post - symbol of the uri the post in question
  */
      const that = this
      const viewPost = function (uris) {
        const xviewReply = that.xviewReply
        for (let i = 0; i < xviewReply.childNodes.length; i++) {
          xviewReply.removeChild(xviewReply.childNodes[0])
        }
        const xcloseContainer = doc.createElement('li')
        xcloseContainer.className = 'closeContainer'
        const xcloseButton = doc.createElement('span')
        xcloseButton.innerHTML = '&#215;'
        xcloseButton.className = 'closeButton'
        xcloseContainer.appendChild(xcloseButton)
        xviewReply.appendChild(xcloseContainer)
        for (const uri in uris) {
          xviewReply.appendChild(
            that.generatePost(kb.sym(uris[uri]), this.thisIsMe, 'view')
          )
        }
        xviewReply.className = 'replyView-active'
        that.microblogPane.appendChild(xviewReply)
      }
      // container for post
      const xpost = doc.createElement('li')
      xpost.className = 'post'
      xpost.setAttribute('id', String(post.uri).split('#')[1])
      const Post = mb.getPost(post)
      // username text
      // var uname = kb.any(kb.any(post, SIOC('has_creator')), SIOC('id'))
      const uholdsaccount = kb.any(
        undefined,
        FOAF('holdsAccount'),
        kb.any(post, SIOC('has_creator'))
      )
      const xuname = doc.createElement('a')
      xuname.href = uholdsaccount.uri
      xuname.className = 'userLink'
      const xunameText = doc.createTextNode(mb.getUser(Post.creator).id)
      xuname.appendChild(xunameText)
      // user image
      const xuavatar = doc.createElement('img')
      xuavatar.src = mb.getUser(Post.creator).avatar.uri
      xuavatar.className = 'postAvatar'
      // post content
      const xpostContent = doc.createElement('blockquote')
      let postText = Post.message
      // post date
      const xpostLink = doc.createElement('a')
      xpostLink.className = 'postLink'
      xpostLink.addEventListener(
        'click',
        function () {
          viewPost([post.uri])
        },
        false
      )
      xpostLink.id = 'post_' + String(post.uri).split('#')[1]
      xpostLink.setAttribute('content', post.uri)
      xpostLink.setAttribute('property', 'permalink')
      const postLink = doc.createTextNode(
        Post.date ? Post.date : 'post date unknown'
      )
      xpostLink.appendChild(postLink)

      // LINK META DATA (MENTIONS, HASHTAGS, GROUPS)
      const mentions = kb.each(post, SIOC('topic'))
      const tags = {}

      for (const mention in mentions) {
        sf.lookUpThing(mentions[mention])
        const id = kb.any(mentions[mention], SIOC('id'))
        tags['@' + id] = mentions[mention]
      }
      const postTags = postText.match(/(@|#|!)\w+/g)
      const postFunction = function () {
        const p = postTags.pop()
        return tags[p]
          ? kb.any(undefined, FOAF('holdsAccount'), tags[p]).uri
          : p
      }
      for (const t in tags) {
        const person = t.replace(/@/, '')
        const replacePerson = RegExp('(@|!|#)(' + person + ')')
        postText = postText.replace(
          replacePerson,
          '$1<a href="' + postFunction() + '">$2</a>'
        )
      }
      xpostContent.innerHTML = postText

      // in reply to logic
      // This has the potential to support a post that replies to many messages.
      const inReplyTo = kb.each(post, SIOC('reply_of'))
      const xreplyTo = doc.createElement('span')
      for (const reply in inReplyTo) {
        var theReply
        theReply = String(inReplyTo[reply]).replace(/<|>/g, '')
        const genReplyTo = function () {
          const reply = doc.createElement('a')
          reply.innerHTML = ', <b>in reply to</b>'
          reply.addEventListener(
            'click',
            function () {
              viewPost([post.uri, theReply])
              return false
            },
            false
          )
          return reply
        }
        xreplyTo.appendChild(genReplyTo())
      }

      // END LINK META DATA
      // add the reply to and delete buttons to the interface
      const mbReplyTo = function () {
        const id = mb.getUser(Post.creator).id
        const xupdateStatus = doc.getElementById('xupdateStatus')
        const xinReplyToContainer = doc.getElementById('xinReplyToContainer')
        const xupdateSubmit = doc.getElementById('xupdateSubmit')
        xupdateStatus.value = '@' + id + ' '
        xupdateStatus.focus()
        xinReplyToContainer.value = post.uri
        xupdateSubmit.value = 'Reply'
      }
      const mbDeletePost = function (evt) {
        const lsconfirmNo = function () {
          doc
            .getElementById('notify-container')
            .removeChild(xconfirmDeletionDialog)
          evt.target.disabled = false
        }
        const lsconfirmYes = function () {
          reallyDelete()
          doc
            .getElementById('notify-container')
            .removeChild(xconfirmDeletionDialog)
        }
        evt.target.disabled = true
        var xconfirmDeletionDialog = doc.createElement('li')
        xconfirmDeletionDialog.className = 'notify conf'
        xconfirmDeletionDialog.innerHTML +=
          '<p>Are you sure you want to delete this post?</p>'
        xconfirmDeletionDialog.addEventListener(
          'keyup',
          function (evt) {
            if (evt.keyCode === 27) {
              lsconfirmNo()
            }
          },
          false
        )
        const confirmyes = doc.createElement('input')
        confirmyes.type = 'button'
        confirmyes.className = 'confirm'
        confirmyes.value = 'Delete'
        confirmyes.addEventListener('click', lsconfirmYes, false)
        const confirmno = doc.createElement('input')
        confirmno.type = 'button'
        confirmno.className = 'confirm'
        confirmno.value = 'Cancel'
        confirmno.addEventListener('click', lsconfirmNo, false)
        xconfirmDeletionDialog.appendChild(confirmno)
        xconfirmDeletionDialog.appendChild(confirmyes)
        doc
          .getElementById('notify-container')
          .appendChild(xconfirmDeletionDialog)
        confirmno.focus()

        var reallyDelete = function () {
          // callback after deletion
          const mbconfirmDeletePost = function (a, success) {
            if (success) {
              that.notify('Post deleted.')
              // update the ui to reflect model changes.
              const deleteThisNode = evt.target.parentNode
              deleteThisNode.parentNode.removeChild(deleteThisNode)
              kb.removeMany(deleteMe)
            } else {
              that.notify('Oops, there was a problem, please try again')
              evt.target.disabled = true
            }
          }
          // delete references to post
          const deleteContainerOf = function (a, success) {
            if (success) {
              const deleteContainer = kb.statementsMatching(
                undefined,
                SIOC('container_of'),
                kb.sym(
                  doc
                    .getElementById('post_' + evt.target.parentNode.id)
                    .getAttribute('content')
                )
              )
              sparqlUpdater.batch_delete_statement(
                deleteContainer,
                mbconfirmDeletePost
              )
            } else {
              that.notify('Oops, there was a problem, please try again')
              evt.target.disabled = false
            }
          }
          // delete attributes of post
          evt.target.disabled = true
          const deleteMe = kb.statementsMatching(
            kb.sym(
              doc
                .getElementById('post_' + evt.target.parentNode.id)
                .getAttribute('content')
            )
          )
          sparqlUpdater.batch_delete_statement(deleteMe, deleteContainerOf)
        }
      }
      if (mb.getMyURI()) {
        // If the microblog in question does not belong to the user,
        // display the delete post and reply to post buttons.
        var themaker = kb.any(post, SIOC('has_creator'))
        if (mb.getMyURI() !== themaker.uri) {
          var xreplyButton = doc.createElement('input')
          xreplyButton.type = 'button'
          xreplyButton.value = 'reply'
          xreplyButton.className = 'reply'
          xreplyButton.addEventListener('click', mbReplyTo, false)
        } else {
          var xdeleteButton = doc.createElement('input')
          xdeleteButton.type = 'button'
          xdeleteButton.value = 'Delete'
          xdeleteButton.className = 'reply'
          xdeleteButton.addEventListener('click', mbDeletePost, false)
        }
      }

      const mbFavorite = function (evt) {
        const nid = evt.target.parentNode.id
        const favpost = doc.getElementById('post_' + nid).getAttribute('content')
        xfavorite.className += ' ing'
        const cbFavorite = function (a, success, _c, _d) {
          if (success) {
            xfavorite.className =
              xfavorite.className.split(' ')[1] === 'ed'
                ? 'favorit'
                : 'favorit ed'
          }
        }
        if (!myFavorites.favorited(favpost)) {
          myFavorites.add(favpost, cbFavorite)
        } else {
          myFavorites.remove(favpost, cbFavorite)
        }
      }
      var xfavorite = doc.createElement('a')
      xfavorite.innerHTML = '&#9733;'
      xfavorite.addEventListener('click', mbFavorite, false)
      if (myFavorites.favorited(post.uri)) {
        xfavorite.className = 'favorit ed'
      } else {
        xfavorite.className = 'favorit'
      }
      // build
      xpost.appendChild(xuavatar)
      xpost.appendChild(xpostContent)
      if (mb.getMyURI()) {
        xpost.appendChild(xfavorite)
        if (mb.getMyURI() !== themaker.uri) {
          xpost.appendChild(xreplyButton)
        } else {
          xpost.appendChild(xdeleteButton)
        }
      }
      xpost.appendChild(xuname)
      xpost.appendChild(xpostLink)
      if (inReplyTo !== '') {
        xpost.appendChild(xreplyTo)
      }
      return xpost
    }
    Pane.prototype.generatePostList = function (gmbPosts) {
      /*
      generatePostList - Generate the posts and
      display their results on the interface.
      */
      const postList = doc.createElement('ul')
      const postlist = {}
      const datelist = []
      for (const post in gmbPosts) {
        const postDate = kb.any(gmbPosts[post], terms('created'))
        if (postDate) {
          datelist.push(postDate)
          postlist[postDate] = this.generatePost(gmbPosts[post], this.thisIsMe)
        }
      }
      datelist.sort().reverse()
      for (const d in datelist) {
        postList.appendChild(postlist[datelist[d]])
      }
      return postList
    }
    Pane.prototype.followsView = function () {
      const getFollowed = function (user) {
        let userid = kb.any(user, SIOC('id'))
        const follow = doc.createElement('li')
        follow.className = 'follow'
        userid = userid || user.uri
        let fol = kb.any(undefined, FOAF('holdsAccount'), user)
        fol = fol ? fol.uri : user.uri
        follow.innerHTML = '<a href="' + fol + '">' + userid + '</a>'
        return follow
      }
      const xfollows = doc.createElement('div')
      xfollows.id = 'xfollows'
      xfollows.className = 'followlist-container view-container'
      if (this.creator && kb.whether(this.creator.sym, SIOC('follows'))) {
        const creatorFollows = kb.each(this.creator.sym, SIOC('follows'))
        const xfollowsList = doc.createElement('ul')
        for (const thisPerson in creatorFollows) {
          xfollowsList.appendChild(getFollowed(creatorFollows[thisPerson]))
        }
        xfollows.appendChild(xfollowsList)
      }
      this.Tab.create('tab-follows', 'Follows', xfollows, false)
      return xfollows
    }
    Pane.prototype.streamView = function (s, doc) {
      const postContainer = doc.createElement('div')
      postContainer.id = 'postContainer'
      postContainer.className = 'post-container view-container active'
      let mbPosts = []
      if (kb.whether(s, FOAF('name')) && kb.whether(s, FOAF('holdsAccount'))) {
        sf.lookUpThing(kb.any(s, FOAF('holdsAccount')))
        const follows = kb.each(kb.any(s, FOAF('holdsAccount')), SIOC('follows'))
        for (const f in follows) {
          sf.lookUpThing(follows[f])
          // look up people user follows
          const smicroblogs = kb.each(follows[f], SIOC('creator_of'))
          // get the follows microblogs
          for (const smb in smicroblogs) {
            sf.lookUpThing(smicroblogs[smb])
            if (kb.whether(smicroblogs[smb], SIOC('topic'), follows[f])) {
              continue
            } else {
              mbPosts = mbPosts.concat(
                kb.each(smicroblogs[smb], SIOC('container_of'))
              )
            }
          }
        }
      }
      if (mbPosts.length > 0) {
        const postList = this.generatePostList(mbPosts)
        // generate stream
        postList.id = 'postList'
        postList.className = 'postList'
        postContainer.appendChild(postList)
      }
      this.Tab.create('tab-stream', 'By Follows', postContainer, true)
      return postContainer
    }
    Pane.prototype.notificationsView = function (s, doc) {
      const postNotificationContainer = doc.createElement('div')
      postNotificationContainer.id = 'postNotificationContainer'
      postNotificationContainer.className =
        'notification-container view-container'
      const postMentionContainer = doc.createElement('div')
      postMentionContainer.id = 'postMentionContainer'
      postMentionContainer.className = 'mention-container view-container'
      let mbnPosts = []
      let mbmPosts = []
      // get mbs that I am the creator of.
      const theUser = kb.any(s, FOAF('holdsAccount'))
      const user = kb.any(theUser, SIOC('id'))
      const microblogs = kb.each(theUser, SIOC('creator_of'))
      for (const mbm in microblogs) {
        sf.lookUpThing(microblogs[mbm])
        if (kb.whether(microblogs[mbm], SIOC('topic'), theUser)) {
          mbmPosts = mbmPosts.concat(
            kb.each(microblogs[mbm], SIOC('container_of'))
          )
        } else {
          if (kb.whether(microblogs[mbm], RDF('type'), SIOCt('Microblog'))) {
            mbnPosts = mbnPosts.concat(
              kb.each(microblogs[mbm], SIOC('container_of'))
            )
          }
        }
      }
      const postNotificationList = this.generatePostList(mbnPosts)
      postNotificationList.id = 'postNotificationList'
      postNotificationList.className = 'postList'
      postNotificationContainer.appendChild(postNotificationList)

      const postMentionList = this.generatePostList(mbmPosts)
      postMentionList.id = 'postMentionList'
      postMentionList.className = 'postList'
      postMentionContainer.appendChild(postMentionList)
      this.postMentionContainer = postMentionContainer
      this.postNotificationContainer = postNotificationContainer
      this.Tab.create(
        'tab-by-user',
        'By ' + user,
        postNotificationContainer,
        false
      )
      this.Tab.create('tab-at-user', '@' + user, postMentionContainer, false)
    }
    Pane.prototype.build = function () {
      const microblogPane = this.microblogPane
      this.headerContainer = this.header(s, doc)
      this.postContainer = this.streamView(s, doc)
      this.notificationsView(s, doc)
      this.xfollows = this.followsView()
      microblogPane.className = 'ppane'
      microblogPane.appendChild(this.xviewReply)
      microblogPane.appendChild(this.xnotify)
      microblogPane.appendChild(this.headerContainer)
      if (this.xfollows !== undefined) {
        microblogPane.appendChild(this.xfollows)
      }
      microblogPane.appendChild(this.postContainer)
      microblogPane.appendChild(this.postNotificationContainer)
      microblogPane.appendChild(this.postMentionContainer)
    }

    const microblogpane = doc.createElement('div')
    //      var getusersfollows = function(uri){
    //          var follows = new Object();
    //          var followsa = {follows:0, matches:0};
    //          var accounts = kb.each(s, FOAF("holdsAccount"));
    //          //get all of the accounts that a person holds
    //          for (var acct in accounts){
    //              var account  = accounts[acct].uri;
    //              var act = kb.each(kb.sym(account),SIOC("follows"));
    //              for (var a in act){
    //                  var thisuri = act[a].uri.split("#")[0];
    //                  if (!follows[thisuri]){followsa.follows+=1;}
    //                  follows[thisuri] =true;
    //              }
    //          }
    //
    //          var buildPaneUI = function(uri){
    //              followsa.matches = (follows[uri]) ? followsa.matches+1: followsa.matches;
    //              console.log(follows.toSource());
    //              if(followsa.follows == followsa.matches ){
    const ppane = new Pane(s, doc, microblogpane)
    ppane.build()
    //                  return false;
    //              }
    //              else{
    //                  return true;
    //              }
    //          }
    //          sf.addCallback('done',buildPaneUI);
    //          sf.addCallback('fail',buildPaneUI);
    //          //fetch each of the followers
    //          for (var f in follows){
    //              sf.refresh(kb.sym(f));
    //          }
    //      }(s);
    return microblogpane
  }
}
