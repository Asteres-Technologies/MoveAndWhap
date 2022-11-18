class EventTrackingService{
    constructor(chainService, chunkSize, chunkTime) {
        this.chainService = chainService
        this.chunkSize = chunkSize
        this.chunkTime = chunkTime
    }

    async getEventsFrom(address, start, stop, events) {
        const latest = await this.chainService.getHeight();
        if(start == "latest") { start = latest; }
        if(stop == "latest") { stop = latest; }
        
        let filter = {
            address: address,
            fromBlock: start,
            toBlock: stop,
            eventTopics: this.chainService.getTopicIds(events)
        };

        let blocks = [];
        let remainder = (stop - start) % this.chunkSize;
        if(remainder > 0) {
            filter.toBlock = start+remainder;
            blocks = blocks.concat(await this.chainService.getLogs(filter));
            start += remainder;
        }
        
        let totalChunks = (stop - start)/this.chunkSize;
        for(let c = 0; c < totalChunks; c++)
        {
            filter.fromBlock = start;
            filter.toBlock = start + this.chunkSize;
            blocks = blocks.concat(await this.chainService.getLogs(filter));
            start = filter.toBlock;
        }

        return blocks;
    }

    filterBlockTxs(events, blocks){
        let eventIds = this.chainService.getTopicIds(events);
        let properlyFiltered = [];
        let duplicateChecker = {};

        for(let b = 0; b < blocks.length; b++) {
            for(let e = 0; e < eventIds.length; e++) {
                if(blocks[b].topics.includes(eventIds[e])){
                    //Sometimes tehre are duplicate entries, make sure they aren't added.
                    let dupKey = `${blocks[b].blockNumber}-${blocks[b].transactionHash}`;
                    if(duplicateChecker[dupKey] !== true) { 
                        properlyFiltered.push(blocks[b]); 
                        duplicateChecker[dupKey] = true;
                    }
                }
            }
        }

        return properlyFiltered;
    }

    orderBlockTxs(blocks) {
        return blocks.sort((a, b) => this.txIsAheadOrBehind(a,b));
    }

    //Callback for sorting.
    //Return 1 if transaction is ahead or -1 if transaction is behind.
    txIsAheadOrBehind(txA, txB){
        if(txA.blockNumber > txB.blockNumber) { return 1; }
        else if(txA.blockNumber == txB.blockNumber){
            if(txA.transactionIndex > txB.transactionIndex) { return 1; }
        }
        else { return -1; }
    }
}

export {EventTrackingService}