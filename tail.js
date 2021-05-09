var midi, data;

function onMIDISuccess(midiAccess) {
  log( "midi access granted" );
    status("OK");
    midi = midiAccess;
    midi.onstatechange = onStateChange;
    onStateChange(null);
}

function onStateChange(e) {
    var str = "";
    var es9 = -1;
    var inputs = midi.inputs.values();
    for ( var input = inputs.next(); input && !input.done; input = inputs.next() ) {
      str += "<option value='" + input.value.id + "'>" + input.value.name + "</option>";
      if ( input.value.name == "ES-9 MIDI In" ) {
        es9 = input.value.id;
      }
    }
    document.getElementById( "midiinput" ).innerHTML = str
    if ( es9 != -1 ) {
      document.getElementById( "midiinput" ).value = es9;
    }
    str = "";
    es9 = -1;
    var outputs = midi.outputs.values();
    for ( var output = outputs.next(); output && !output.done; output = outputs.next() ) {
      str += "<option value='" + output.value.id + "'>" + output.value.name + "</option>";
      if ( output.value.name == "ES-9 MIDI Out" ) {
        es9 = output.value.id;
      }
    }
    document.getElementById( "midioutput" ).innerHTML = str
    if ( es9 != -1 ) {
      document.getElementById( "midioutput" ).value = es9;
    }

  changeInput();

  if ( es9 != -1 ) {
    reqConfig();
  }
}

function onMIDIFailure(e) {
  log( "midi access failure" );
    status("No access to MIDI devices or your browser doesn't support WebMIDI API.");
}

function changeInput() {
    var inputs = midi.inputs.values();
    if ( inputs.size == 0 ) {
      return;
    }
    for ( var input = inputs.next(); input && !input.done; input = inputs.next() ) {
      input.value.onmidimessage = "";
    }
  var input = midi.inputs.get( document.getElementById( "midiinput" ).value );
  input.onmidimessage = onMIDIMessage;
}

function onMIDIMessage(message) {
    data = message.data;
    var header = [ 240, 0, 33, 39, 0x19 ];
    for ( var i=0; i<5; ++i ) {
      if ( header[i] != data[i] ) {
        return;
      }
    }
  var dd = log( "received sysex (" + data.length + " bytes)" );
  dumpSysex( data, "rxSysex", dd+"\n" );
  if ( data[5] == 0x32 ) {
    // version string
      var str = String.fromCharCode.apply( null, data.slice( 6, -1 ) );
    document.getElementById( "rxSysex" ).value += ( "\n-----\n" + str );
  }
  else if ( data[5] == 0x10 ) {
    // config dump
    parseConfigDump( data.slice( 8, -1 ) );
  }
  else if ( data[5] == 0x11 ) {
    // mix dump
    parseMixDump( data.slice( 6, -1 ) );
  }
  else if ( data[5] == 0x12 ) {
    // usage
    parseUsage( data.slice( 6, -1 ) );
  }
  else if ( ( data[5] & 0xF0 ) == 0x60 ) {
    // set mixer
    var mix = data[5] & 0xF;
    var ch = data[6];
    var value = ( data[7] << 14 ) | ( data[8] << 7 ) | data[9];
    var id = "mix" + mix + "_" + ch;
    document.getElementById( id ).value = value;
      updateMixText( mix, ch, value );
  }
}

function send() {
  var str = makeSysEx();
  var arr = new Uint8Array( str.length );
  for ( var i=0; i<str.length; ++i ) {
    arr[i] = str.charCodeAt( i );
  }
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  output.send( arr );
  var dd = log( "sent sysex (" + str.length + " bytes)" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function sendMsg() {
  var str = makeMsgSysEx();
  var arr = new Uint8Array( str.length );
  for ( var i=0; i<str.length; ++i ) {
    arr[i] = str.charCodeAt( i );
  }
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  output.send( arr );
  var dd = log( "sent sysex (" + str.length + " bytes)" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function reqVersion() {
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x22, 0xF7 ];
  output.send( arr );
  var dd = log( "sent version request to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function reqConfig() {
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x23, 0xF7 ];
  output.send( arr );
  var dd = log( "sent config request to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function reqUsage() {
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x2B, 0xF7 ];
  output.send( arr );
  var dd = log( "sent usage request to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function saveToFlash( wh ) {
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x24, wh, 0xF7 ];
  output.send( arr );
  var dd = log( "sent save request to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function restoreFromFlash( wh ) {
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x25, wh, 0xF7 ];
  output.send( arr );
  var dd = log( "sent restore request to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function resetFlash() {
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x26, 0xF7 ];
  output.send( arr );
  var dd = log( "sent reset request to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function changeOptions( options ) {
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x32, options, 0xF7 ];
  output.send( arr );
  var dd = log( "sent options update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
  updateOptions( options );
  rebuildMixer();
}

function changeMIDIChannels() {
  var ch_usb = document.getElementById( 'midi_ch_usb' ).value;
  var ch_din = document.getElementById( 'midi_ch_din' ).value;
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x35, ch_usb, ch_din, 0xF7 ];
  output.send( arr );
  var dd = log( "sent midi channel update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function updateOptions( options ) {
  var sh = ( options == 0 );
  var label;
  if ( sh ) {
    label = "&#x21E9;<br>S/PDIF ports<br>&#x21E9;";
  } else {
    label = "&#x21E9;<br>Mixer 2<br>&#x21E9;";
  }
    document.getElementById("dsp3_table_label" ).innerHTML = label;
  sh = !sh;
  for ( m=2; m<8; ++m ) {
    showHide( "cs3_" + m, sh );
    showHide( "cl3_" + m, sh );
    showHide( "ol3_" + m, sh );
    showHide( "os3_" + m, sh );
  }
  for ( m=8; m<16; ++m ) {
    showHide( "mix" + m, sh );
  }
  document.getElementById( 'options_1_mixer' ).checked = sh;
  document.getElementById( 'options_1_spdif' ).checked = !sh;
}

function updateDC() {
  var b = 0;
  for ( var i = 1; i <= 7; ++i ) {
    var id = "dc_" + i;
    var bb = document.getElementById( id ).checked;
    if ( bb ) {
      b |= ( 1 << (i-1) );
    }
  }
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x31, b, 0xF7 ];
  output.send( arr );
  var dd = log( "sent DC blocking update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function updateCR( wh ) {
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var v = document.getElementById( 'cr_' + wh ).checked;
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x28, wh-1, 1-v, 0xF7 ];
  output.send( arr );
  var dd = log( "sent codec reset to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function resyncCodec( wh ) {
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x29, wh-1, 0xF7 ];
  output.send( arr );
  var dd = log( "sent codec resync to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function updateLink( which, cb ) {
  rebuildMixer();
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x33, which, cb.checked, 0xF7 ];
  output.send( arr );
  var dd = log( "sent link update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function updateCapture( dsp, ch ) {
  // check stereo links
  var v = document.getElementById( "cs" + dsp + "_" + ch ).value;
  if ( document.getElementById( "link" + (v>>4) + "_" + (v&0xe) ).checked ) {
    document.getElementById( "cs" + dsp + "_" + ((ch&0xe)+0) ).value = (v&0xfe)+0;
    document.getElementById( "cs" + dsp + "_" + ((ch&0xe)+1) ).value = (v&0xfe)+1;
  }
  // update ES-9
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x40+dsp ];
  var i;
  for ( i=0; i<8; ++i ) {
    var v = document.getElementById( "cs" + dsp + "_" + i ).value;
    if ( ( v >> 4 ) == 7 ) {
      v = inputCaptureLookup[ v & 0xf ];
    }
    arr.push( v );
  }
  arr.push( 0xF7 );
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  output.send( arr );
  var dd = log( "sent capture update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
  if ( dsp >= 2 ) {
    rebuildMixer();
  }
}

function updateMixTag( m ) {
  var id;
  if ( m < 8 ) {
    id = "os2_" + m;
  } else {
    id = "os3_" + (m-8);
  }
  var v = document.getElementById( id );
  var tag = "Mix " + ( m+1 ) + " : " + v.options[v.selectedIndex].text;
  document.getElementById( "mixtag" + m ).innerHTML = tag;
  var vv = document.getElementById( "vmixtag" + m );
  id = "link" + id.substr(2);
  if ( ( (m&1) == 0 ) && document.getElementById( id ).checked ) {
    if ( m < 8 ) {
      id = "os2_" + (m+1);
    } else {
      id = "os3_" + (m-8+1);
    }
    var v2 = document.getElementById( id );
    tag = "Mix " + ( m+1 ) + "/" + ( m+2 ) + " : " + v.options[v.selectedIndex].text + "/" +  v2.options[v2.selectedIndex].text;
  }
  if ( vv ) {
    vv.innerHTML = tag;
  }
}

function updateMixChTag( dsp, ch ) {
  var v = document.getElementById( "cs" + dsp + "_" + ch );
  var tag = v.options[v.selectedIndex].text;
  var vtag = tag;
  var cs = v.value;
  if ( document.getElementById( "link" + (cs>>4) + "_" + (cs&0xe) ).checked ) {
    vtag += "/" + ((cs&0xe)+2);
  }
  var m;
  for ( m=0; m<8; ++m ) {
    document.getElementById( "mixcht" + (m+8*(dsp-2)) + "_" + ch ).innerHTML = tag;
    var vv = document.getElementById( "vmixcht" + (m+8*(dsp-2)) + "_" + ch );
    if ( vv ) {
      vv.innerHTML = vtag;
    }
  }
}
function updateOutputs( dsp ) {
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x50+dsp ];
  var i;
  for ( i=0; i<8; ++i )
    arr.push( document.getElementById( "os" + dsp + "_" + i ).value );
  arr.push( 0xF7 );
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  output.send( arr );
  var dd = log( "sent outputs update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
  if ( dsp >= 2 ) {
    for ( i=0; i<8; ++i ) {
      updateMixTag( i + 8*(dsp-2) );
    }
  }
}

function updateMixText( mix, ch, v ) {
  var id = "mixt" + mix + "_" + ch;
  var str = "-\u221EdB";
  if ( v > 0 ) {
    var vv = 6 * Math.log2( v/8192.0 );
    if ( v == 0x7fff ) {
      str = "+12dB";
    }
    else if ( vv > 0 ) {
      str = "+" + vv.toFixed(1) + "dB";
    }
    else {
      str = vv.toFixed(1) + "dB";
    }
  }
  document.getElementById( id ).innerHTML = str;
}

function mixSlider( mix, ch ) {
  var id = "mix" + mix + "_" + ch;
  var v = document.getElementById( id ).value;
  var w = v;
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x60+mix, ch, w>>14, (w>>7)&0x7f, w&0x7f, 0xf7 ];
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  output.send( arr );
  var dd = log( "sent mix update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );

  updateMixText( mix, ch, v );
}

function updateOutDCText( ch, v ) {
  var id = "outDC_" + ch + "t";
  var str = v;
  document.getElementById( id ).innerHTML = str;
}

function outDCSlider( ch ) {
  var id = "outDC_" + ch;
  var w = document.getElementById( id ).value;
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x36, ch, (w>>14)&0x3, (w>>7)&0x7f, w&0x7f, 0xf7 ];
  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  output.send( arr );
  var dd = log( "sent dc offset update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );

  updateOutDCText( ch, w );
}

function vmixToDb( v ) {
  var db = -72.0;
  if ( v > 0 ) {
    if ( v >= 55 ) {
      db = -24.0 + 0.5 * ( v - 55.0 );
    } else {
      db = -72.0 + ( v - 1 ) * ( 72 - 24 ) / ( 55.0 - 1 );
    }
  }
  return db;
}

function dbToMix( db ) {
  var v = Math.round( 0x2000 * Math.pow( 2, db/6 ) );
  v = Math.min( v, 0x7fff );
  if ( db < -72 )
    v = 0;
  return v;
}

function dbToVmix( db ) {
  var v;
  if ( db < -72.0 ) {
    v = 0;
  } else if ( db >= -24.0 ) {
    v = Math.round( ( db + 24 ) * 2 + 55 );
  } else {
    v = Math.round( ( db + 72 ) * ( 55.0-1 ) / ( 72 - 24 ) + 1 );
  }
  return v;
}

function mixToDb( v ) {
  var db;
  if ( v >= 0x7fff ) {
    db = 12.0;
  } else if ( v == 0 ) {
    db = -80.0;
  } else {
    db = 6 * Math.log2( v/8192.0 );
  }
  return db;
}

function updateVMixText( mix, ch ) {
  var id = "vmix" + mix + "_" + ch;
  var e = document.getElementById( id );
  if ( e == null ) {
    return;
  }
  var v = e.value;
  var id = "vmixt" + mix + "_" + ch;
  var str = "-\u221EdB";
  var db = vmixToDb( v );
  if ( db > -72.0 ) {
      str = db.toFixed(1) + "dB";
    if ( db > 0 ) {
      str = "+" + str;
    }
  }
  document.getElementById( id ).innerHTML = str;
}

function updateVPanText( mix, ch ) {
  var id = "vpan" + mix + "_" + ch;
  var e = document.getElementById( id );
  if ( e == null ) {
    return;
  }
  var v = e.value;
  var id = "vpant" + mix + "_" + ch;
  if ( v == 0 )
    str = "C";
  else if ( v > 0 )
    str = v + "R";
  else
    str = (-v) + "L";
  document.getElementById( id ).innerHTML = str;
}

function modifyMix( mix, ch, v ) {
  var id = "mix" + mix + "_" + ch;
  document.getElementById( id ).value = v;
  mixSlider( mix, ch );
}

function vmixSlider( mix, ch, stereo ) {
  var id = "vmix" + mix + "_" + ch;
  var v = parseInt( document.getElementById( id ).value );

  updateVMixText( mix, ch );

  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x34, mix * 8 + ch, v, 0xF7 ];
  output.send( arr );
  var dd = log( "sent mix update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

function vmixDoubleClick( mix, ch, stereo ) {
  var id = "vmix" + mix + "_" + ch;
  var v = parseInt( document.getElementById( id ).value );

  if ( v == 103 ) {
    document.getElementById( id ).value = 0;
  } else {
    document.getElementById( id ).value = 103;
  }

  vmixSlider( mix, ch, stereo );
}

function vpanSlider( mix, ch, stereo ) {
  var id = "vpan" + mix + "_" + ch;
  var v = parseInt( document.getElementById( id ).value );

  updateVPanText( mix, ch );

  var output = midi.outputs.get( document.getElementById( "midioutput" ).value );
  var arr = [ 0xF0, 0x00, 0x21, 0x27, 0x19, 0x34, (mix+1) * 8 + ch, 64+v, 0xF7 ];
  output.send( arr );
  var dd = log( "sent mix update to ES-9" );
  dumpSysex( arr, "txSysex", dd+"\n" );
}

if ( navigator.requestMIDIAccess ) {
    navigator.requestMIDIAccess ( {
        sysex: true
    } ).then(onMIDISuccess, onMIDIFailure);
} else {
    status("No MIDI support in your browser.");
}

rebuildMixer();
