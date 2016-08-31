const createTorrent = require('create-torrent')
const path = require('path')
const prettyBytes = require('prettier-bytes')
const React = require('react')

const {dispatch, dispatcher} = require('../lib/dispatcher')

const FlatButton = require('material-ui/FlatButton').default
const RaisedButton = require('material-ui/RaisedButton').default
const TextField = require('material-ui/TextField').default
const Checkbox = require('material-ui/Checkbox').default

const CreateTorrentErrorPage = require('../components/create-torrent-error-page')
const Heading = require('../components/heading')
const ShowMore = require('../components/show-more')

// Shows a basic UI to create a torrent, from an already-selected file or folder.
// Includes a "Show Advanced..." button and more advanced UI.
class CreateTorrentPage extends React.Component {
  constructor (props) {
    super(props)

    const state = this.props.state
    const info = state.location.current()

    // First, extract the base folder that the files are all in
    let pathPrefix = info.folderPath
    if (!pathPrefix) {
      pathPrefix = info.files.map((x) => x.path).reduce(findCommonPrefix)
      if (!pathPrefix.endsWith('/') && !pathPrefix.endsWith('\\')) {
        pathPrefix = path.dirname(pathPrefix)
      }
    }

    // Then, exclude .DS_Store and other dotfiles
    const files = info.files
      .filter((f) => !containsDots(f.path, pathPrefix))
      .map((f) => ({name: f.name, path: f.path, size: f.size}))
    if (files.length === 0) return (<CreateTorrentErrorPage state={state} />)

    // Then, use the name of the base folder (or sole file, for a single file torrent)
    // as the default name. Show all files relative to the base folder.
    let defaultName, basePath
    if (files.length === 1) {
      // Single file torrent: /a/b/foo.jpg -> torrent name 'foo.jpg', path '/a/b'
      defaultName = files[0].name
      basePath = pathPrefix
    } else {
      // Multi file torrent: /a/b/{foo, bar}.jpg -> torrent name 'b', path '/a'
      defaultName = path.basename(pathPrefix)
      basePath = path.dirname(pathPrefix)
    }

    // Default trackers
    const trackers = createTorrent.announceList.join('\n')

    this.state = {
      comment: '',
      isPrivate: false,
      pathPrefix,
      basePath,
      defaultName,
      files,
      trackers
    }

    // Create React event handlers only once
    this.setIsPrivate = (_, isPrivate) => this.setState({isPrivate})
    this.setComment = (_, comment) => this.setState({comment})
    this.setTrackers = (_, trackers) => this.setState({trackers})
    this.handleSubmit = handleSubmit.bind(this)
  }

  render () {
    const files = this.state.files

    // Sanity check: show the number of files and total size
    const numFiles = files.length
    const totalBytes = files
      .map((f) => f.size)
      .reduce((a, b) => a + b, 0)
    const torrentInfo = `${numFiles} files, ${prettyBytes(totalBytes)}`

    return (
      <div className='create-torrent'>
        <Heading level={1}>Create torrent {this.state.defaultName}</Heading>
        <div className='torrent-info'>{torrentInfo}</div>
        <div className='torrent-attribute'>
          <label>Path:</label>
          <div>{this.state.pathPrefix}</div>
        </div>
        <ShowMore
          style={{
            marginBottom: 10
          }}
          hideLabel='Hide advanced settings...'
          showLabel='Show advanced settings...'>
          {this.renderAdvanced()}
        </ShowMore>
        <div className='float-right'>
          <FlatButton
            label='Cancel'
            style={{
              marginRight: 10
            }}
            onClick={dispatcher('cancel')} />
          <RaisedButton
            label='Create Torrent'
            primary
            onClick={this.handleSubmit} />
        </div>
      </div>
    )
  }

  // Renders everything after clicking Show Advanced...:
  // * Is Private? (private torrents, not announced to DHT)
  // * Announce list (trackers)
  // * Comment
  renderAdvanced () {
    // Create file list
    const maxFileElems = 100
    const files = this.state.files
    const fileElems = files.slice(0, maxFileElems).map((file, i) => {
      const relativePath = path.relative(this.state.pathPrefix, file.path)
      return (<div key={i}>{relativePath}</div>)
    })
    if (files.length > maxFileElems) {
      fileElems.push(<div key='more'>+ {files.length - maxFileElems} more</div>)
    }

    // Align the text fields
    const textFieldStyle = { width: '' }
    const textareaStyle = { margin: 0 }

    return (
      <div key='advanced' className='create-torrent-advanced'>
        <div key='private' className='torrent-attribute'>
          <label>Private:</label>
          <Checkbox
            className='torrent-is-private'
            style={{display: ''}}
            checked={this.state.isPrivate}
            onCheck={this.setIsPrivate} />
        </div>
        <div key='trackers' className='torrent-attribute'>
          <label>Trackers:</label>
          <TextField
            className='torrent-trackers'
            style={textFieldStyle}
            textareaStyle={textareaStyle}
            multiLine
            rows={2}
            rowsMax={10}
            value={this.state.trackers}
            onChange={this.setTrackers} />
        </div>
        <div key='comment' className='torrent-attribute'>
          <label>Comment:</label>
          <TextField
            className='torrent-comment'
            style={textFieldStyle}
            textareaStyle={textareaStyle}
            hintText='Optionally describe your torrent...'
            multiLine
            rows={2}
            rowsMax={10}
            value={this.state.comment}
            onChange={this.setComment} />
        </div>
        <div key='files' className='torrent-attribute'>
          <label>Files:</label>
          <div>{fileElems}</div>
        </div>
      </div>
    )
  }
}

function handleSubmit () {
  const announceList = this.state.trackers
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s !== '')
  const options = {
    // We can't let the user choose their own name if we want WebTorrent
    // to use the files in place rather than creating a new folder.
    name: this.state.defaultName,
    path: this.state.basePath,
    files: this.state.files,
    announce: announceList,
    private: this.state.isPrivate,
    comment: this.state.comment.trim()
  }
  dispatch('createTorrent', options)
}

// Finds the longest common prefix
function findCommonPrefix (a, b) {
  let i
  for (i = 0; i < a.length && i < b.length; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) break
  }
  if (i === a.length) return a
  if (i === b.length) return b
  return a.substring(0, i)
}

function containsDots (path, pathPrefix) {
  const suffix = path.substring(pathPrefix.length).replace(/\\/g, '/')
  return ('/' + suffix).includes('/.')
}

module.exports = CreateTorrentPage
