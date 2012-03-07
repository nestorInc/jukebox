//Tool functions
//Todo copy it into library
function sort_unique(arr) {
    arr = arr.sort(function (a, b) { return a*1 - b*1; });
    var ret = [arr[0]];
    for (var i = 1; i < arr.length; i++) { 
        if (arr[i-1] !== arr[i]) {
            ret.push(arr[i]);
        }
    }
    return ret;
}



function generatePagesLinks(identifier, currentPage, currentSelection, nbPages){
    var pages = Array();
    // TODO put this constant in a javascript config file
    var threshold = 5;
    var result = '';
    
    // If nb pages to display > 25 we show only first pages, current selection page, and last pages links
    if( nbPages > 25 ){
        // TODO put the + 2 in a javascript config file
        for( var i = 1; i < Math.ceil(threshold) + 2; ++i) {
            if( i > 0 && i <= nbPages ){
                pages.push(i);
            }
        }
    } else { 
            for( var i=1; i<=nbPages ;++i){
                pages.push(i);
            }
    }
    
    // If we want to add focus on another variable we juste to add an entry in this array
    focusElements = Array();
    focusElements[0] = currentPage;
    //Just uncomment the next line to show 3 pages links around slider selection page
    // focusElements[1] = currentSelection;
    pages.push(currentSelection);
    // Hide too far pages algorithm
    for( var k = 0; k < focusElements.length; ++k){
        var currentCount = Math.ceil(threshold/2);
        for( var i = focusElements[k] - Math.ceil(threshold/2)  ; i < focusElements[k] ; ++i ){
            if( i > 0 && i <= nbPages ){
                currentCount--;
                pages.push(i);
            }
        }
        
        pages.push(focusElements[k]);
        var currentCount2 = Math.ceil(threshold/2);
        for( var i = focusElements[k] + 1 ; i < focusElements[k] + Math.ceil(threshold/2) +1 ; ++i ){
            if( i > 0 && i <= nbPages ){
                currentCount2--;
                pages.push(i);
            }
        }
        
        // Add missed before pages at the end of the array
        if( currentCount > 0 ){
            for(var i = focusElements[k] + Math.ceil(threshold/2); i < focusElements[k] + Math.ceil(threshold); ++i){
                if( i > 0 && i <= nbPages )
                    pages.push(i);
            }
        } else if( currentCount2 > 0){
            for(var i = focusElements[k] - Math.ceil(threshold); i < focusElements[k] + Math.ceil(threshold/2); ++i){
                if( i > 0 && i <= nbPages)
                    pages.push(i);
            }
        } 
    }
    
    for(var i = nbPages - Math.ceil(threshold) ; i <= nbPages; ++i){
        if( i > 0 && i <= nbPages){
            pages.push(i);
        }
    }
    pages=sort_unique(pages);
    var lastdisplayedValue = null;
    for(var i=0; i < pages.length; ++i){
        
        if( lastdisplayedValue != null && lastdisplayedValue != pages[i] - 1){
            result+= ".....";
        }
        result += "<a href='javascript:void(0)' onclick=\"javascript:tabs.getTabFromUniqueId( '" + identifier + "').goToPage(" + pages[i] + ");\" class='";
        
        if( pages[i] == currentPage ){
            result += "slider_link_current_page" ;
        } else if( pages[i] == currentSelection ){
            result += "slider_link_current_selection" ;
        } else {
            result += "slider_link" ;
        }
        result +=  "'>" + pages[i] +"</a> ";
        lastdisplayedValue = pages[i];
    }
    
    return result;
}

var SearchTab = Class.create(Tab, {
    initialize : function( server_results ){
        // Search parameters 
        this.identifier = server_results.identifier;
        this.updateNewSearchInformations(server_results);

        this.reloadControlers = true;
        this.pages = new Array();
        this.resultsSlider = null;

        /* Sliders */
        this.sliders = new Array();
    },

    updateNewSearchInformations : function( server_results ){
        // tab name 
        if( server_results.search_value == ''){
            this.name = "Library";
        } else if ( server_results.search_comparison == 'equal' && server_results.search_field == 'artist'){
            this.name = server_results.search_value;
        } else if ( server_results.search_comparison == 'equal' && server_results.search_field == 'album'){
            if( server_results.results.length > 0 ) {
                // Caution it could generate errors
                this.name =  server_results.results[0].artist + " - " + server_results.search_value;
            } else {
                this.name = server_results.search_value;
            }
        } else {
            this.name =  server_results.search_value;
        }

        this.select_fields = server_results.select_fields;
        this.search_value = server_results.search_value;
        this.search_comparison = server_results.search_comparison ;
        this.search_field = server_results.search_field ;
        this.first_result = server_results.first_result;
        this.result_count = server_results.result_count;
        this.order_by = server_results.order_by;
        this.order_by_way = server_results.order_by_way;
        this.total_results = server_results.total_results;
        this.server_results = server_results.results;

        /* Gets the number of pages */
        this.page_count = Math.floor( this.total_results / this.result_count);
        if( this.total_results % this.result_count > 0  )
            this.page_count = this.page_count + 1;

        /* Gets the current page number */
        this.current_page = Math.floor(this.first_result / this.result_count)+1;
        if( this.current_page > this.page_count ) {
            this.current_page = 1;
        }
    },
    
    // This function is used to add all pages search results in the playqueue
    // TODO add playqueue identifier to parameters
    addSearchToPlayQueue : function( play_queue_position ) {
        // Create the JSon request
        var action = new Object();
        action.name = "add_search_to_play_queue";
        action.play_queue_position = play_queue_position;
        action.select_fields = "mid" ;
        action.search_value = this.search_value ;
        action.search_comparison = this.search_comparison
        action.search_field = this.search_field ;
        action.order_by = this.order_by ;
        action.order_by_way = this.order_by_way;

        if( "like" == action.search_comparison ) {
            action.first_result = this.first_result;
            action.result_count = this.result_count;
        } else {
            action.first_result = 0;
            action.result_count = null;
        }
        
        // Send the query to the server
        query.action = action;
        updateJukebox();
    },

    goToPage : function (page) {
        doSearch((page - 1) * this.result_count,
                 this.identifier,
                 this.select_fields,
                 this.search_value, 
                 this.search_comparison, 
                 this.search_field, 
                 this.order_by,
                 this.order_by_way,
                 this.result_count);
    },

    updateContent : function( ){
        if(true == this.reloadControlers){

            var search_page = '';
            
            /* Save in the current instance the targeted tags and needed informations */        
            $$('collection_pagelist_' + this.identifier).each(function(s) {
	            s.remove();
            });
            
            if( null != $('collection_content_' + this.identifier) ){
                $('collection_content_' + this.identifier).remove();
            }
            /* pre-init html structure */
            search_page += '<br/>';
            search_page += '<div class="collection_pagelist"';
            search_page += ' name="collection_pagelist_' + this.identifier + '"></div>';
            search_page += '<div id="collection_content_' + this.identifier + '"></div>';
            search_page += '<div class="collection_pagelist"';
            search_page += ' name="collection_pagelist_' + this.identifier + '"></div>';
            $('tabContent_' + this.identifier).update(search_page);
            
            // Display sliders and links and init sliders behvior
            this.initAndDisplaySearchControllers();
            this.reloadControlers = false;
        } else {
            var links = generatePagesLinks(this.identifier, 
                                            this.current_page, 
                                            this.current_page, 
                                           this.page_count);
            $$('[name=page_links_' + this.identifier + ']').each(function(s) {
	            s.update(links);
            });
        }

        // Display search results and init dragabble items
        this.initAndDisplaySearchResults();

    },

    /* Update sliders and pages*/
    initAndDisplaySearchControllers : function(){
        var pagelist_html = '';
        
        /* Only display slider and pages results links if nb pages > 1 */
        if( this.total_results > 0 ){
            pagelist_html += '<p>'
            if( this.page_count > 1 ){
	            pagelist_html += '<div name="results_slider_' + this.getIdentifier() + '"';
                pagelist_html += ' class="slider" style="height:10px; width:600px"><div class="handle" style="height:10px;"></div></div>';
	            pagelist_html += '<div class="page_links" name="page_links_' + this.getIdentifier() + '"></div>';
            }
            pagelist_html += '</p>';
        }
        
        // Display sliders and links
        $$('[name=collection_pagelist_' + this.getIdentifier()+']').each(function(s) {
	        s.update(pagelist_html);
        });

        // Fill the pages array used by sliders
        for(var i = 0; i < this.page_count; ++i){
            this.pages.push(i+1);
        }

        // Init the link list
        var links = generatePagesLinks(this.identifier, this.current_page, this.current_page, this.page_count);
        $$('[name=page_links_' + this.getIdentifier() + ']' ).each(function(s) {
	        s.update(links);
        });

        // Init each sliders behavior
        var locked = new Array();

        this.resultsSlider = document.getElementsByName('results_slider_' + this.getIdentifier() );
        var tabId = this.getIdentifier();
        for(var i = 0 ; i <  this.resultsSlider.length; i++ ){
            var currentSlider = new Control.Slider(this.resultsSlider[i].down('.handle'), this.resultsSlider[i], {
                range: $R(1,tabs.getTabFromUniqueId(tabId).pages.length),
                values: tabs.getTabFromUniqueId(tabId).pages,
                sliderValue: tabs.getTabFromUniqueId(tabId).current_page || 1,
                id:i,
                identifier:tabId,
                timeout:null,
                lastSelectedValue: null,
                onSlide: function(values){
                    var currentTab = tabs.getTabFromUniqueId(this.identifier);
                    $$('[name=page_links_' + this.identifier + ']').each(function(s) {
	                    s.update(generatePagesLinks(this.identifier, 
                                                    currentTab.current_page, 
                                                    values, 
                                                    currentTab.page_count));
                    });
                    
                    for( var k in currentTab.sliders ){
                        if ( k != this.id ){
                            locked[k]=true;
                            /* Update others sliders values by setting value with the current slider sliding value*/
                            if(typeof currentTab.sliders[k].setValue === 'function') {
                                /* Caution this instruction fire onChange slider event */
                                currentTab.sliders[k].setValue(values);
                            }
                            locked[k]=false;
                        }
                    }

                    // Auto page selection if stuck on a page
                    if( this.lastSelectedValue != values ) {
                        clearTimeout(this.timeout);
                        this.timeout = setTimeout("tabs.getTabFromUniqueId('" + this.identifier+ "').goToPage(" + values + ");", 400); 
                    }

                    this.lastSelectedValue = values;
                },
                onChange: function(values){
                    var currentTab = tabs.getTabFromUniqueId(this.identifier);
                    /* Because we use multi slider we don't want to fire onChange event when sliding the other slider */
                    if( ! locked[this.id] ){
                        clearTimeout(this.timeout);
                        if( currentTab.current_page != values)
                            tabs.getTabFromUniqueId(this.identifier).goToPage(values);
                    }
                }
            });
            this.sliders.push(currentSlider);
        }
    },

    initAndDisplaySearchResults : function() {
        var pagelist_html = '';
        var songlist_html = '';
        var addToPlayQueuemids = new Array();
        var add_page_results = '';
        var librarySongs = null;
        var identifier = this.getIdentifier();
        var count = this.result_count;
        if(this.total_results > 0) {
            var i = 0;
            var grey_bg = false;
            
            librarySongs = this.server_results;

            librarySongs.each(function(s) {
                var style = '';

                addToPlayQueuemids.push(s.mid);

                if (grey_bg == true) {
                    style = 'background-color: #DEDEDE;';
                }

	            songlist_html += '<li id="library_li_' + identifier + '_' + i + '">';
	            songlist_html += '<div id="library_song_'+ identifier + '_' + i;
                songlist_html += '" style="position:relative;';
                songlist_html +=  style + '" class="library_draggable">';
	            songlist_html += '<a href="javascript:void(0)" onclick="addToPlayQueue(' + s.mid + ',0);return false;">';
                songlist_html += '<span class="add_to_play_queue_top"></span></a>';
	            songlist_html += '<a href="javascript:void(0)" onclick="addToPlayQueueBottom(' + s.mid + ');return false;">';
                songlist_html += '<span class="add_to_play_queue_bottom"></span></a>';
	            songlist_html += '<div id="library_handle_' + identifier +'_'+ i + '">'
                /* TODO create a class song_link to generate the link in the same way for playqueue/search/currentsong */
                songlist_html += '<a href="javascript:void(0)" onclick="doSearch( 1, null, null,\'';
                songlist_html +=  s.artist.replace(/'/g,"\\'") +'\', \'equal\',\'artist\',\'artist,album,title\',\'up\',' + count + ' )">' ;
                songlist_html +=  s.artist + '</a> - ';
                songlist_html += '<a href="javascript:void(0)" onclick="doSearch( 1, null, null, \'';
                songlist_html +=  s.album.replace(/'/g,"\\'");
                songlist_html += '\', \'equal\',\'album\',\'artist,album,title\',\'up\',' + count + ' )">' + s.album + '</a> - ';
                songlist_html += '' + s.title;
	            songlist_html += '</div></div></li>';
	            i++;
                grey_bg = !grey_bg;
            });

            /* Add links to add all research current page songs into playqueue */
            add_page_results += '<li>';
            add_page_results += '<div style="position:relative;">';
            /* Add research to playqueue on tail */
            add_page_results += '<a onclick="tabs.getTabFromUniqueId(\'' + identifier + '\')';
            add_page_results += '.addSearchToPlayQueue(\'tail\');return false;"';
            add_page_results += 'href="javascript:void(0)"><span class="add_to_play_queue_bottom"></span></a>';

            /* Add research page song in the head playqueue */
            add_page_results += '<a onclick="tabs.getTabFromUniqueId(\'' + identifier + '\')';
            add_page_results += '.addSearchToPlayQueue(\'head\');return false;"';
            add_page_results += 'href="javascript:void(0)"><span class="add_to_play_queue_top"></span></a>';
            add_page_results += '</div><div style="background-color:#888888;">&nbsp;</div></li>';

            songlist_html = '<ul>' + add_page_results + songlist_html + add_page_results + '</ul>';

        } else {
            // Todo display no results more beautifully
            songlist_html += "no results found";
        }
        $('collection_content_' + this.getIdentifier() ).update(songlist_html);
        
        
        // Create all draggables, once update is done.
        for (var i = 0; i < librarySongs.length; i++) {
	        new Draggable('library_song_' + this.getIdentifier() + '_' + i, {
	            scroll: window,
	            revert: true,
	            handle: 'library_handle_' + this.getIdentifier() + '_' + i
	        });
        }
    }

});