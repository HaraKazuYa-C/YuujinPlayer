const messages = {
    en: {
        musicPlayer: 'Music Player',
        library: 'Library',
        nowPlaying: 'Now Playing',
        lyrics: 'Lyrics',
        playlist: 'Playlist',
        addTrack: 'Add Track',
        addFolder: 'Add Folder',
        importLyrics: 'Import Lyrics',
        importTranslation: 'Import Translation',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        settings: 'Settings',
        language: 'Language',
        theme: 'Theme',
        equalizer: 'Equalizer',
        performanceMode: 'Performance Mode',
        enablePerformanceMode: 'Enable Performance Mode',
        enableExtremePerformanceMode: 'Enable Extreme Performance Mode',
        disablePerformanceMode: 'Disable Performance Mode',
        en: 'English',
        zh: '中文',
        ja: '日本語'
    },
    zh: {
        musicPlayer: '音乐播放器',
        library: '音乐库',
        nowPlaying: '正在播放',
        lyrics: '歌词',
        playlist: '播放列表',
        addTrack: '添加歌曲',
        addFolder: '添加文件夹',
        importLyrics: '导入歌词',
        importTranslation: '导入翻译',
        darkMode: '深色模式',
        lightMode: '浅色模式',
        settings: '设置',
        language: '语言',
        theme: '主题',
        equalizer: '均衡器',
        performanceMode: '性能模式',
        enablePerformanceMode: '启用性能模式',
        enableExtremePerformanceMode: '启用极限性能模式',
        disablePerformanceMode: '禁用性能模式',
        en: 'English',
        zh: '中文',
        ja: '日本語'
    },
    ja: {
        musicPlayer: 'ミュージックプレーヤー',
        library: 'ライブラリ',
        nowPlaying: '再生中',
        lyrics: '歌詞',
        playlist: 'プレイリスト',
        addTrack: 'トラックを追加',
        addFolder: 'フォルダを追加',
        importLyrics: '歌詞をインポート',
        importTranslation: '翻訳をインポート',
        darkMode: 'ダークモード',
        lightMode: 'ライトモード',
        settings: '設定',
        language: '言語',
        theme: 'テーマ',
        equalizer: 'イコライザー',
        performanceMode: 'パフォーマンスモード',
        enablePerformanceMode: 'パフォーマンスモードを有効にする',
        enableExtremePerformanceMode: '極限パフォーマンスモードを有効にする',
        disablePerformanceMode: 'パフォーマンスモードを無効にする',
        en: 'English',
        zh: '中文',
        ja: '日本語'
    }
};

const i18n = new VueI18n({
    locale: 'en',
    messages,
});

new Vue({
    el: '#app',
    i18n,
    data: {
        sidebarOpen: true,
        currentView: 'library',
        playlist: [],
        currentTrackIndex: -1,
        isPlaying: false,
        audio: new Audio(),
        progress: 0,
        currentTime: 0,
        duration: 0,
        lyrics: [],
        translations: {},
        activeLyricIndex: -1,
        waveform: null,
        isDarkMode: false,
        resizeObserver: null,
        lyricsTranslateY: 0,
        isMidiTrack: false,
        midiPlayer: null,
        equalizerBands: [
            { frequency: 32, gain: 0 },
            { frequency: 64, gain: 0 },
            { frequency: 125, gain: 0 },
            { frequency: 250, gain: 0 },
            { frequency: 500, gain: 0 },
            { frequency: 1000, gain: 0 },
            { frequency: 2000, gain: 0 },
            { frequency: 4000, gain: 0 },
            { frequency: 8000, gain: 0 },
            { frequency: 16000, gain: 0 }
        ],
        audioContext: null,
        equalizer: null,
        backgroundImage: '',
        isDropdownOpen: false,
        performanceMode: false,
        extremePerformanceMode: false
    },
    computed: {
        currentTrack() {
            return this.playlist[this.currentTrackIndex] || { 
                title: this.$t('musicPlayer'), 
                artist: '',
                coverArt: 'https://via.placeholder.com/300'
            };
        },
        displayedLyrics() {
            return this.lyrics.map(line => ({
                ...line,
                translation: this.translations[line.time]
            }));
        }
    },
    watch: {
        '$i18n.locale': function (newLocale) {
            console.log('Language changed to: ' + newLocale);
        },
        currentTrackIndex: function() {
            this.updateWaveform();
        },
        isDarkMode: {
            handler() {
                this.updateOverlayColor();
            },
            immediate: true
        },
        currentTrackIndex: {
            handler(newIndex) {
                if (newIndex >= 0 && newIndex < this.playlist.length) {
                    const track = this.playlist[newIndex];
                    this.updateBackgroundFromAlbumArt(track.coverArt);
                }
            },
            immediate: true
        }
    },
    methods: {
        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },
        togglePlay() {
            if (this.isMidiTrack) {
                if (this.isPlaying) {
                    this.midiPlayer.pause();
                } else {
                    this.midiPlayer.resume();
                }
            } else {
                if (this.isPlaying) {
                    this.audio.pause();
                } else {
                    if (this.audioContext && this.audioContext.state === 'suspended') {
                        this.audioContext.resume();
                    }
                    this.audio.play().catch(e => console.error("Error playing audio:", e));
                }
            }
            this.isPlaying = !this.isPlaying;
            this.updateFeatherIcons();
        },
        async playTrack(index) {
            if (index >= 0 && index < this.playlist.length) {
                this.currentTrackIndex = index;
                const track = this.playlist[this.currentTrackIndex];
                this.isMidiTrack = track.isMidi;

                await this.updateBackgroundFromAlbumArt(track.coverArt);

                if (this.isMidiTrack) {
                    this.audio.pause();
                    try {
                        await this.initMidiPlayer(track.file);
                        this.isPlaying = true;
                    } catch (error) {
                        console.error("Error initializing MIDI player:", error);
                        this.isPlaying = false;
                    }
                } else {
                    if (this.midiPlayer) {
                        this.midiPlayer.stop();
                    }
                    this.audio.src = URL.createObjectURL(track.file);
                    
                    try {
                        await new Promise((resolve, reject) => {
                            this.audio.oncanplaythrough = resolve;
                            this.audio.onerror = reject;
                            this.audio.load();
                        });

                        await this.audio.play();
                        this.isPlaying = true;
                        console.log("Audio started playing successfully");
                    } catch (error) {
                        console.error("Error playing audio:", error);
                        console.log("Current track:", track);
                        console.log("Audio src:", this.audio.src);
                        this.isPlaying = false;
                    }
                }

                this.currentView = 'nowPlaying';
                this.updateWaveform();
                this.updateFeatherIcons();
            }
        },
        playNext() {
            if (this.playlist.length > 0) {
                this.playTrack((this.currentTrackIndex + 1) % this.playlist.length);
            }
        },
        playPrevious() {
            if (this.playlist.length > 0) {
                this.playTrack((this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length);
            }
        },
        updateProgress() {
            if (this.isMidiTrack) {
                if (this.midiPlayer) {
                    const currentTime = this.midiPlayer.getSongTime();
                    const totalTime = this.midiPlayer.getSongTime(true);
                    this.progress = (currentTime / totalTime) * 100 || 0;
                    this.currentTime = currentTime;
                    this.duration = totalTime;
                }
            } else {
                if (this.audio.duration && !isNaN(this.audio.duration)) {
                    this.progress = (this.audio.currentTime / this.audio.duration) * 100 || 0;
                    this.currentTime = this.audio.currentTime;
                    this.duration = this.audio.duration;
                } else {
                    this.progress = 0;
                    this.currentTime = 0;
                    this.duration = 0;
                }
            }
            this.updateActiveLyric();
        },
        formatTime(time) {
            if (isNaN(time) || time === Infinity) {
                return '0:00';
            }
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        },
        async handleFileSelect(event) {
            const file = event.target.files[0];
            if (file) {
                await this.addTrackToPlaylist(file);
            }
        },
        async handleFolderSelect(event) {
            const files = Array.from(event.target.files);
            for (const file of files) {
                if (file.type.startsWith('audio/') || file.name.endsWith('.mid') || file.name.endsWith('.midi')) {
                    await this.addTrackToPlaylist(file);
                }
            }
        },
        async addTrackToPlaylist(file) {
            if (file.type.startsWith('audio/') || file.name.endsWith('.mp3')) {
                try {
                    const tags = await this.getAudioTags(file);
                    const track = {
                        id: Date.now() + Math.random(),
                        title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
                        artist: tags.artist || 'Unknown Artist',
                        album: tags.album || 'Unknown Album',
                        file: file,
                        coverArt: tags.picture ? this.getAlbumArtUrl(tags.picture) : 'https://via.placeholder.com/300',
                        isMidi: false
                    };
                    this.playlist.push(track);
                    if (this.playlist.length === 1) {
                        this.playTrack(0);
                    }
                } catch (error) {
                    console.error('Error parsing metadata:', error);
                    const track = {
                        id: Date.now() + Math.random(),
                        title: file.name.replace(/\.[^/.]+$/, ""),
                        artist: 'Unknown Artist',
                        album: 'Unknown Album',
                        file: file,
                        coverArt: 'https://via.placeholder.com/300',
                        isMidi: false
                    };
                    this.playlist.push(track);
                }
            } else if (file.name.endsWith('.mid') || file.name.endsWith('.midi')) {
                const track = {
                    id: Date.now() + Math.random(),
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: 'MIDI Track',
                    album: 'MIDI Album',
                    file: file,
                    coverArt: 'https://via.placeholder.com/300?text=MIDI',
                    isMidi: true
                };
                this.playlist.push(track);
                if (this.playlist.length === 1) {
                    this.playTrack(0);
                }
            }
        },
        getAudioTags(file) {
            return new Promise((resolve, reject) => {
                jsmediatags.read(file, {
                    onSuccess: function(tag) {
                        resolve({
                            title: tag.tags.title,
                            artist: tag.tags.artist,
                            album: tag.tags.album,
                            picture: tag.tags.picture
                        });
                    },
                    onError: function(error) {
                        reject(error);
                    }
                });
            });
        },
        getAlbumArtUrl(picture) {
            if (picture) {
                let base64String = "";
                for (let i = 0; i < picture.data.length; i++) {
                    base64String += String.fromCharCode(picture.data[i]);
                }
                return `data:${picture.format};base64,${window.btoa(base64String)}`;
            }
            return 'https://via.placeholder.com/300';
        },
        importLyrics() {
            this.$refs.lyricsInput.click();
        },
        importTranslation() {
            this.$refs.translationInput.click();
        },
        handleLyricsImport(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    this.lyrics = this.parseLRC(content);
                };
                reader.readAsText(file);
            }
        },
        handleTranslationImport(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    this.translations = this.parseLRC(content).reduce((acc, line) => {
                        acc[line.time] = line.parts.map(part => part.text).join('');
                        return acc;
                    }, {});
                };
                reader.readAsText(file);
            }
        },
        parseLRC(lrc) {
            const lines = lrc.split('\n');
            const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})(\/?r?)\]/;
            return lines
                .map(line => {
                    const match = timeRegex.exec(line);
                    if (match) {
                        const [, min, sec, ms, alignment] = match;
                        const time = parseFloat(min) * 60 + parseFloat(sec) + parseFloat(ms) / 1000;
                        const text = line.replace(timeRegex, '').trim();
                        const parts = this.parseHarmony(text);
                        const isRightAligned = alignment === '/r';
                        return { time, parts, isRightAligned };
                    }
                    return null;
                })
                .filter(line => line !== null)
                .sort((a, b) => a.time - b.time);
        },
        parseHarmony(text) {
            const parts = [];
            let isHarmony = false;
            let currentPart = '';

            for (let i = 0; i < text.length; i++) {
                if (text[i] === '(') {
                    if (currentPart) {
                        parts.push({ text: currentPart, isHarmony: false });
                        currentPart = '';
                    }
                    isHarmony = true;
                } else if (text[i] === ')') {
                    parts.push({ text: currentPart, isHarmony: true });
                    currentPart = '';
                    isHarmony = false;
                } else {
                    currentPart += text[i];
                }
            }

            if (currentPart) {
                parts.push({ text: currentPart, isHarmony: isHarmony });
            }

            return parts;
        },
        updateActiveLyric() {
            const currentTime = this.isMidiTrack ? (this.midiPlayer ? this.midiPlayer.getSongTime() : 0) : this.audio.currentTime;
            let newIndex = this.lyrics.findIndex(line => line.time > currentTime);
            if (newIndex === -1) {
                newIndex = this.lyrics.length - 1;
            } else {
                newIndex = Math.max(0, newIndex - 1);
            }
            if (newIndex !== this.activeLyricIndex) {
                this.activeLyricIndex = newIndex;
                this.$nextTick(() => {
                    this.scrollToActiveLyric();
                });
            }
        },
        scrollToActiveLyric() {
            const container = this.$refs.lyricsContainer;
            const activeElement = this.$refs['lyricLine_' + this.activeLyricIndex][0];
            if (container && activeElement) {
                const containerHeight = container.clientHeight;
                const elementTop = activeElement.offsetTop;
                const elementHeight = activeElement.clientHeight;
                
                // 计算目标滚动位置，使活动歌词行居中并略微上移
                const targetScrollPosition = elementTop - (containerHeight / 6) + (elementHeight / 6) - 10;
                
                // 使用 GSAP 实现更快、带弹跳的平滑滚动
                gsap.to(this, {
                    duration: 0.4,
                    lyricsTranslateY: -targetScrollPosition,
                    ease: "back.out(1.3)",
                    onUpdate: () => {
                        // 确保歌词内容不会滚动超出容器
                        const lyricsContent = container.querySelector('.lyrics-content');
                        const maxScroll = lyricsContent.clientHeight - container.clientHeight;
                        if (-this.lyricsTranslateY > maxScroll) {
                            this.lyricsTranslateY = -maxScroll;
                        }
                    }
                });
            }
        },
        updateWaveform() {
            if (this.waveform) {
                this.waveform.destroy();
            }
            
            if (this.isMidiTrack) {
                const options = {
                    chart: {
                        type: 'line',
                        height: this.extremePerformanceMode ? 25 : (this.performanceMode ? 50 : 100),
                        width: this.extremePerformanceMode ? '25%' : (this.performanceMode ? '50%' : '100%'),
                        animations: {
                            enabled: !this.performanceMode,
                        },
                        toolbar: {
                            show: false
                        },
                        background: 'transparent'
                    },
                    series: [{
                        name: 'MIDI Visualization',
                        data: Array(128).fill(0)
                    }],
                    xaxis: {
                        labels: {
                            show: false
                        },
                        axisBorder: {
                            show: false
                        },
                        axisTicks: {
                            show: false
                        }
                    },
                    yaxis: {
                        labels: {
                            show: false
                        },
                        max: 127
                    },
                    grid: {
                        show: false
                    },
                    colors: [this.isDarkMode ? '#0a84ff' : '#0071e3']
                };
                
                this.waveform = new ApexCharts(document.querySelector("#waveform"), options);
                this.waveform.render();
                
                const updateMidiVisualization = () => {
                    if (this.midiPlayer && this.midiPlayer.playback) {
                        const activeNotes = this.midiPlayer.playback.activeNotes;
                        const visualizationData = Array(128).fill(0);
                        activeNotes.forEach(note => {
                            visualizationData[note.noteNumber] = note.velocity;
                        });
                        this.waveform.updateSeries([{
                            data: visualizationData
                        }]);
                    }
                    if (!this.extremePerformanceMode) {
                        requestAnimationFrame(updateMidiVisualization);
                    }
                };
                
                updateMidiVisualization();
            } else {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                
                const analyser = this.audioContext.createAnalyser();
                const source = this.audioContext.createMediaElementSource(this.audio);
                source.connect(analyser);
                analyser.connect(this.audioContext.destination);
                
                analyser.fftSize = 256;
                const bufferLength = this.extremePerformanceMode ? analyser.frequencyBinCount / 4 : (this.performanceMode ? analyser.frequencyBinCount / 2 : analyser.frequencyBinCount);
                const dataArray = new Uint8Array(bufferLength);
                
                const options = {
                    chart: {
                        type: 'bar',
                        height: this.extremePerformanceMode ? 25 : (this.performanceMode ? 50 : 100),
                        width: this.extremePerformanceMode ? '25%' : (this.performanceMode ? '50%' : '100%'),
                        animations: {
                            enabled: !this.performanceMode,
                        },
                        toolbar: {
                            show: false
                        },
                        background: 'transparent'
                    },
                    series: [{
                        name: 'waveform',
                        data: Array(bufferLength).fill(0)
                    }],
                    xaxis: {
                        labels: {
                            show: false
                        },
                        axisBorder: {
                            show: false
                        },
                        axisTicks: {
                            show: false
                        }
                    },
                    yaxis: {
                        labels: {
                            show: false
                        },
                        max: 255
                    },
                    grid: {
                        show: false
                    },
                    colors: [this.isDarkMode ? '#0a84ff' : '#0071e3']
                };
                
                this.waveform = new ApexCharts(document.querySelector("#waveform"), options);
                this.waveform.render();
                
                const updateWaveform = () => {
                    analyser.getByteFrequencyData(dataArray);
                    this.waveform.updateSeries([{
                        data: Array.from(dataArray)
                    }]);
                    if (this.extremePerformanceMode) {
                        setTimeout(updateWaveform, 500);
                    } else if (this.performanceMode) {
                        setTimeout(updateWaveform, 100);
                    } else {
                        requestAnimationFrame(updateWaveform);
                    }
                };
                
                updateWaveform();
            }
        },
        toggleDarkMode() {
            this.isDarkMode = !this.isDarkMode;
            if (this.isDarkMode) {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else {
                document.documentElement.classList.add('light');
                document.documentElement.classList.remove('dark');
            }
            if (this.waveform) {
                this.waveform.updateOptions({
                    colors: [this.isDarkMode ? '#0a84ff' : '#0071e3']
                });
            }
            this.updateOverlayColor();
            this.updateFeatherIcons();
        },
        updateFeatherIcons() {
            this.$nextTick(() => {
                feather.replace();
            });
        },
        async initMidiPlayer(file) {
            await MIDI.loadPlugin({
                soundfontUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/",
                instrument: "acoustic_grand_piano",
                onprogress: (state, progress) => {
                    console.log(state, progress);
                },
                onsuccess: () => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const midiFile = new Uint8Array(e.target.result);
                        this.midiPlayer = new MIDI.Player();
                        this.midiPlayer.loadArrayBuffer(midiFile);
                        this.midiPlayer.start();
                        this.midiPlayer.on('endOfFile', () => {
                            this.playNext();
                        });
                    };
                    reader.readAsArrayBuffer(file);
                }
            });
        },
        initEqualizer() {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            const source = this.audioContext.createMediaElementSource(this.audio);

            this.equalizer = this.equalizerBands.map(band => {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = band.frequency;
                filter.Q.value = 1;
                filter.gain.value = band.gain;
                return filter;
            });

            source.connect(this.equalizer[0]);
            for (let i = 0; i < this.equalizer.length - 1; i++) {
                this.equalizer[i].connect(this.equalizer[i + 1]);
            }
            this.equalizer[this.equalizer.length - 1].connect(this.audioContext.destination);

            this.$nextTick(() => {
                this.equalizerBands.forEach((band, index) => {
                    const slider = document.getElementById(`eq-slider-${index}`);
                    noUiSlider.create(slider, {
                        start: [0],
                        range: {
                            'min': -12,
                            'max': 12
                        },
                        orientation: 'vertical',
                        direction: 'rtl'
                    });

                    slider.noUiSlider.on('update', (values) => {
                        const gain = parseFloat(values[0]);
                        this.equalizer[index].gain.setValueAtTime(gain, this.audioContext.currentTime);
                        this.equalizerBands[index].gain = gain;
                    });
                });
            });
        },
        async updateBackgroundFromAlbumArt(coverArtUrl) {
            this.backgroundImage = coverArtUrl;
            
            const flowingAlbum1 = document.getElementById('flowingAlbum1');
            const flowingAlbum2 = document.getElementById('flowingAlbum2');
            
            flowingAlbum1.style.backgroundImage = `url(${coverArtUrl})`;
            flowingAlbum2.style.backgroundImage = `url(${coverArtUrl})`;
            
            flowingAlbum2.style.animationDelay = '10s';
            
            this.updateOverlayColor();
        },
        updateOverlayColor() {
            const overlay = document.getElementById('backgroundOverlay');
            if (this.isDarkMode) {
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            } else {
                overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            }
        },
        toggleDropdown() {
            this.isDropdownOpen = !this.isDropdownOpen;
        },
        selectLanguage(locale) {
            this.$i18n.locale = locale;
            this.isDropdownOpen = false;
        },
        togglePerformanceMode() {
            if (!this.performanceMode) {
                this.performanceMode = true;
                this.extremePerformanceMode = false;
            } else if (this.performanceMode && !this.extremePerformanceMode) {
                this.extremePerformanceMode = true;
            } else {
                this.performanceMode = false;
                this.extremePerformanceMode = false;
            }
            this.applyPerformanceMode();
        },
        applyPerformanceMode() {
            if (this.performanceMode) {
                document.body.classList.add('performance-mode');
                if (this.extremePerformanceMode) {
                    document.body.classList.add('extreme-performance-mode');
                } else {
                    document.body.classList.remove('extreme-performance-mode');
                }
                
                const flowingAlbums = document.querySelectorAll('.flowing-album');
                flowingAlbums.forEach(album => {
                    album.style.animation = 'none';
                });

                this.lowerImageResolution();

                if (this.extremePerformanceMode) {
                    this.hideWaveform();
                } else {
                    this.updateWaveform();
                }

                this.lowerCanvasResolution();

                document.body.classList.add('disable-animations');

                if (this.extremePerformanceMode) {
                    this.simplifyUI();
                }
            } else {
                document.body.classList.remove('performance-mode', 'extreme-performance-mode', 'disable-animations');
                
                const flowingAlbums = document.querySelectorAll('.flowing-album');
                flowingAlbums.forEach(album => {
                    album.style.animation = '';
                });

                this.restoreImageResolution();

                this.showWaveform();
                this.updateWaveform();

                this.restoreCanvasResolution();

                this.restoreUI();
            }
        },
        hideWaveform() {
            if (this.waveform) {
                this.waveform.destroy();
            }
            const waveformElement = document.querySelector("#waveform");
            if (waveformElement) {
                waveformElement.style.display = 'none';
            }
        },
        showWaveform() {
            const waveformElement = document.querySelector("#waveform");
            if (waveformElement) {
                waveformElement.style.display = '';
            }
            this.updateWaveform();
        },
        simplifyUI() {
            document.querySelectorAll('.non-essential').forEach(el => el.style.display = 'none');
            document.querySelector('main').classList.add('simplified-layout');
            document.querySelectorAll('.reduce-spacing').forEach(el => el.classList.add('reduced-spacing'));
        },
        restoreUI() {
            document.querySelectorAll('.non-essential').forEach(el => el.style.display = '');
            document.querySelector('main').classList.remove('simplified-layout');
            document.querySelectorAll('.reduce-spacing').forEach(el => el.classList.remove('reduced-spacing'));
        },
        lowerImageResolution() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                if (!img.dataset.originalSrc) {
                    img.dataset.originalSrc = img.src;
                    img.dataset.originalWidth = img.width;
                    img.dataset.originalHeight = img.height;
                }
                let scaleFactor;
                if (this.extremePerformanceMode) {
                    scaleFactor = 0.1;
                } else if (this.performanceMode) {
                    scaleFactor = 0.5;
                } else {
                    scaleFactor = 1;
                }
                const newWidth = Math.max(Math.floor(img.dataset.originalWidth * scaleFactor), 16);
                const newHeight = Math.max(Math.floor(img.dataset.originalHeight * scaleFactor), 16);
                img.src = this.resizeImage(img, newWidth, newHeight);
                
                if (this.extremePerformanceMode) {
                    img.classList.add('extreme-low-res');
                } else {
                    img.classList.remove('extreme-low-res');
                }
            });
        },
        restoreImageResolution() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                if (img.dataset.originalSrc) {
                    img.src = img.dataset.originalSrc;
                    img.width = img.dataset.originalWidth;
                    img.height = img.dataset.originalHeight;
                }
                img.classList.remove('extreme-low-res');
            });
        },
        resizeImage(img, width, height) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;
            
            if (this.extremePerformanceMode) {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = Math.max(width / 4, 1);
                tempCanvas.height = Math.max(height / 4, 1);
                tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(tempCanvas, 0, 0, width, height);
            } else {
                ctx.drawImage(img, 0, 0, width, height);
            }
            
            return canvas.toDataURL();
        },
        lowerCanvasResolution() {
            const canvases = document.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                canvas.style.width = canvas.width + 'px';
                canvas.style.height = canvas.height + 'px';
                canvas.width = Math.floor(canvas.width * 0.5);
                canvas.height = Math.floor(canvas.height * 0.5);
                ctx.putImageData(imageData, 0, 0);
            });
        },
        restoreCanvasResolution() {
            // This method would need to redraw the canvas at full resolution
            // The implementation depends on how you're originally drawing on the canvas
            // You might need to trigger a redraw of your visualizations here
        },
        isMobileDevice() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },
        isLowEndDevice() {
            const navigator = window.navigator;
            const hardwareConcurrency = navigator.hardwareConcurrency || 2;
            const deviceMemory = navigator.deviceMemory || 2;
            
            return hardwareConcurrency <= 2 || deviceMemory <= 2;
        }
    },
    mounted() {
        this.audio.addEventListener('timeupdate', this.updateProgress);
        this.audio.addEventListener('ended', this.playNext);
        
        this.audio.addEventListener('error', (e) => {
            console.error("Audio error:", e);
        });

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.toggleDarkMode();
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (event.matches) {
                if (!this.isDarkMode) this.toggleDarkMode();
            } else {
                if (this.isDarkMode) this.toggleDarkMode();
            }
        });

        if (window.innerWidth < 768) {
            this.sidebarOpen = false;
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768 && !this.sidebarOpen) {
                this.sidebarOpen = true;
            } else if (window.innerWidth < 768 && this.sidebarOpen) {
                this.sidebarOpen = false;
            }
        });

        this.updateFeatherIcons();

        this.resizeObserver = new ResizeObserver(() => {
            if (this.currentView === 'lyrics') {
                this.scrollToActiveLyric();
            }
        });
        this.resizeObserver.observe(this.$el);

        MIDI.loadPlugin({
            soundfontUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/",
            instrument: "acoustic_grand_piano",
            onprogress: (state, progress) => {
                console.log(state, progress);
            },
            onsuccess: () => {
                console.log('MIDI.js initialized');
            }
        });

        this.initEqualizer();

        document.addEventListener('click', (event) => {
            const dropdown = this.$el.querySelector('.custom-select');
            if (dropdown && !dropdown.contains(event.target)) {
                this.isDropdownOpen = false;
            }
        });

        if (this.isMobileDevice()) {
            this.performanceMode = true;
            if (this.isLowEndDevice()) {
                this.extremePerformanceMode = true;
            }
            this.applyPerformanceMode();
        }
    },
    updated() {
        this.updateFeatherIcons();
    },
    beforeDestroy() {
        this.audio.removeEventListener('timeupdate', this.updateProgress);
        this.audio.removeEventListener('ended', this.playNext);
        this.audio.removeEventListener('error', this.handleAudioError);
        if (this.waveform) {
            this.waveform.destroy();
        }
        window.removeEventListener('resize', this.handleResize);
        window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this.handleColorSchemeChange);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        document.removeEventListener('click', this.handleOutsideClick);
    }
});